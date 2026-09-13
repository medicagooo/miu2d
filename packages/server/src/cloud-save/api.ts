import { isSaveData, LOCAL_SAVE_FORMAT, MAX_SAVE_BYTES } from "@miu2d/types";
import { compare, hash } from "bcryptjs";
import { ensureCloudSchema } from "./schema";

const PREFIX = "/cloud-save/v1";
const COOKIE = "__Host-miu_cloud_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const GAMES = new Set(["demo", "sword1", "sword2"]);
type Bindings = Pick<
  CloudSaveEnv,
  "CLOUD_DB" | "CLOUD_SAVES" | "CLOUD_AUTH_LIMIT" | "CLOUD_WRITE_LIMIT"
>;
interface PlayerRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
}
interface SaveRow {
  id: string;
  user_id: string;
  game_slug: string;
  name: string;
  object_key: string;
  revision: number;
  updated_at: number;
  deleted: number;
}
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers },
  });
function textField(body: Record<string, unknown>, field: string, max: number) {
  const value = body[field];
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new ApiError(400, "输入格式无效");
  return value.trim();
}
function gameSlug(value: string | null) {
  if (!value || !GAMES.has(value)) throw new ApiError(400, "游戏不存在");
  return value;
}
async function readJson(request: Request, max: number): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApiError(415, "请使用 JSON 请求");
  if (Number(request.headers.get("content-length")) > max) throw new ApiError(413, "数据过大");
  if (!request.body) throw new ApiError(400, "请求为空");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > max) {
      await reader.cancel();
      throw new ApiError(413, "数据过大");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "JSON 格式无效");
  }
}
async function digest(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, "0")).join("");
}
function cookieValue(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1) ?? ""
  );
}
const sessionCookie = (token: string, age = SESSION_SECONDS) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
async function currentPlayer(request: Request, db: D1Database) {
  const token = cookieValue(request);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return db
    .prepare(`SELECT p.id, p.name, p.email FROM cloud_sessions s
    JOIN cloud_players p ON p.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(await digest(token), Date.now())
    .first<{ id: string; name: string; email: string }>();
}
const slot = (row: SaveRow) => ({
  id: row.id,
  gameSlug: row.game_slug,
  name: row.name,
  revision: row.revision,
  updatedAt: row.updated_at,
});
async function ownedSave(db: D1Database, id: string, userId: string, game: string) {
  const row = await db
    .prepare(
      "SELECT * FROM cloud_saves WHERE id = ? AND user_id = ? AND game_slug = ? AND deleted = 0"
    )
    .bind(id, userId, game)
    .first<SaveRow>();
  if (!row) throw new ApiError(404, "存档不存在");
  return row;
}
function checkRevision(body: Record<string, unknown>, row: SaveRow) {
  if (body.revision !== row.revision)
    throw new ApiError(409, "存档已在其他设备更新，请刷新列表后重试");
}

async function pruneVersions(env: Bindings, row: SaveRow, deleted = false) {
  const prefix = `saves/${row.user_id}/${row.game_slug}/${row.id}/`;
  let cursor: string | undefined;
  do {
    const page = await env.CLOUD_SAVES.list({ prefix, cursor, limit: 100 });
    for (const object of page.objects) {
      // One-day grace protects readers holding a previous pointer. Failed D1
      // writes leave objects here too and are reclaimed by subsequent saves.
      if (
        deleted ||
        (object.key !== row.object_key && object.uploaded.getTime() < Date.now() - 86400000)
      ) {
        await env.CLOUD_SAVES.delete(object.key);
      }
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

/** Only this prefix may write in the public Worker. Accounts/cookies never go to
 * the upstream resource proxy. Payload objects are private and owner-checked.
 * R2 is written before a conditional D1 pointer change; uncertain D1 failures
 * retain the object (the write might have committed). Cleanup never removes a
 * possibly-current object. Tombstones allow interrupted deletion to be resumed.
 */
export async function cloudSaveApi(request: Request, env: Bindings): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.slice(PREFIX.length);
    if (!["GET", "POST", "PUT", "DELETE"].includes(request.method))
      throw new ApiError(405, "不支持此操作");
    if (request.method !== "GET" && request.headers.get("origin") !== url.origin)
      throw new ApiError(403, "请求来源无效");
    if (!env.CLOUD_DB || !env.CLOUD_SAVES || !env.CLOUD_AUTH_LIMIT || !env.CLOUD_WRITE_LIMIT)
      throw new ApiError(503, "云端存档尚未配置，可先保存到本地");
    // Rate limits precede schema/password work. Platform keys are per location.
    if (request.method !== "GET") {
      const limiter = path.startsWith("/auth/") ? env.CLOUD_AUTH_LIMIT : env.CLOUD_WRITE_LIMIT;
      const key = request.headers.get("cf-connecting-ip") ?? "unknown";
      if (!(await limiter.limit({ key })).success)
        throw new ApiError(429, "操作过于频繁，请稍后重试");
    }
    await ensureCloudSchema(env.CLOUD_DB);
    if (path === "/health" && request.method === "GET") {
      await env.CLOUD_SAVES.list({ limit: 1 });
      return json({ status: "ok", schema: 1 });
    }
    if (path === "/auth/session" && request.method === "GET")
      return json({ user: await currentPlayer(request, env.CLOUD_DB) });
    if (path === "/auth/logout" && request.method === "POST") {
      await env.CLOUD_DB.prepare("DELETE FROM cloud_sessions WHERE token_hash = ?")
        .bind(await digest(cookieValue(request)))
        .run();
      return json({ success: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
    }
    if (["/auth/login", "/auth/register"].includes(path) && request.method === "POST") {
      const body = await readJson(request, 4096);
      const email = textField(body, "email", 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, "邮箱格式无效");
      const password = body.password;
      if (
        typeof password !== "string" ||
        password.length < 8 ||
        new TextEncoder().encode(password).length > 72
      )
        throw new ApiError(400, "密码至少 8 位，最多 72 字节");
      if (!(await env.CLOUD_AUTH_LIMIT.limit({ key: `email:${await digest(email)}` })).success)
        throw new ApiError(429, "操作过于频繁，请稍后重试");
      let player = await env.CLOUD_DB.prepare("SELECT * FROM cloud_players WHERE email = ?")
        .bind(email)
        .first<PlayerRow>();
      if (path === "/auth/register") {
        if (player) throw new ApiError(409, "此邮箱已注册，请登录");
        const name = textField(body, "name", 40);
        const id = crypto.randomUUID();
        const passwordHash = await hash(password, 12);
        const inserted = await env.CLOUD_DB.prepare(
          "INSERT INTO cloud_players (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING"
        )
          .bind(id, email, name, passwordHash, Date.now())
          .run();
        if (!inserted.meta.changes) throw new ApiError(409, "此邮箱已注册，请登录");
        player = { id, email, name, password_hash: passwordHash };
      } else {
        // A fixed cost-12 dummy hash keeps unknown-user verification expensive too.
        const valid = await compare(
          password,
          player?.password_hash ?? "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxXuCZYYuTXJuJqDWcxjb3/fO.6"
        );
        if (!player || !valid) throw new ApiError(401, "邮箱或密码错误");
      }
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
        n.toString(16).padStart(2, "0")
      ).join("");
      await env.CLOUD_DB.prepare(
        "INSERT INTO cloud_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
      )
        .bind(await digest(token), player.id, Date.now() + SESSION_SECONDS * 1000)
        .run();
      await env.CLOUD_DB.prepare("DELETE FROM cloud_sessions WHERE expires_at <= ?")
        .bind(Date.now())
        .run();
      return json({ user: { id: player.id, email: player.email, name: player.name } }, 200, {
        "Set-Cookie": sessionCookie(token),
      });
    }
    const user = await currentPlayer(request, env.CLOUD_DB);
    if (!user) throw new ApiError(401, "请先登录或注册");
    const game = gameSlug(url.searchParams.get("game"));
    if (path === "/saves" && request.method === "GET") {
      const rows = await env.CLOUD_DB.prepare(
        "SELECT * FROM cloud_saves WHERE user_id = ? AND game_slug = ? AND deleted = 0 ORDER BY updated_at DESC"
      )
        .bind(user.id, game)
        .all<SaveRow>();
      return json({ saves: rows.results.map(slot) });
    }
    const id = path.match(/^\/saves\/([a-f0-9-]{36})$/)?.[1];
    if (!id) throw new ApiError(404, "接口不存在");
    if (request.method === "GET") {
      const row = await ownedSave(env.CLOUD_DB, id, user.id, game);
      const object = await env.CLOUD_SAVES.get(row.object_key);
      if (!object) throw new ApiError(503, "存档暂时无法读取，请稍后重试");
      return new Response(object.body, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const body = await readJson(request, MAX_SAVE_BYTES + 8192);
    if (request.method === "DELETE") {
      const row = await env.CLOUD_DB.prepare(
        "SELECT * FROM cloud_saves WHERE id = ? AND user_id = ? AND game_slug = ?"
      )
        .bind(id, user.id, game)
        .first<SaveRow>();
      if (!row) return json({ success: true });
      checkRevision(body, row);
      if (!row.deleted) {
        const result = await env.CLOUD_DB.prepare(
          "UPDATE cloud_saves SET deleted = 1 WHERE id = ? AND user_id = ? AND revision = ? AND deleted = 0"
        )
          .bind(id, user.id, row.revision)
          .run();
        if (!result.meta.changes) throw new ApiError(409, "存档已更新，请刷新列表");
      }
      await pruneVersions(env, row, true);
      return json({ success: true });
    }
    if (request.method !== "PUT") throw new ApiError(405, "不支持此操作");
    const name = textField(body, "name", 80);
    if (!isSaveData(body.data)) throw new ApiError(400, "存档格式无效");
    const payload = JSON.stringify({ format: LOCAL_SAVE_FORMAT, gameSlug: game, data: body.data });
    if (new TextEncoder().encode(payload).length > MAX_SAVE_BYTES)
      throw new ApiError(413, "存档文件过大");
    const old = await env.CLOUD_DB.prepare("SELECT * FROM cloud_saves WHERE id = ?")
      .bind(id)
      .first<SaveRow>();
    if (old && (old.user_id !== user.id || old.game_slug !== game || old.deleted))
      throw new ApiError(404, "存档不存在");
    if (old) checkRevision(body, old);
    else if (body.revision !== 0) throw new ApiError(409, "存档已改变，请刷新列表");
    const revision = (old?.revision ?? 0) + 1;
    const key = `saves/${user.id}/${game}/${id}/${crypto.randomUUID()}.json`;
    await env.CLOUD_SAVES.put(key, payload, { httpMetadata: { contentType: "application/json" } });
    const now = Date.now();
    // Do not delete key if D1 throws: the pointer update may have committed.
    const result = old
      ? await env.CLOUD_DB.prepare(
          "UPDATE cloud_saves SET name = ?, object_key = ?, revision = ?, updated_at = ? WHERE id = ? AND user_id = ? AND revision = ? AND deleted = 0"
        )
          .bind(name, key, revision, now, id, user.id, old.revision)
          .run()
      : await env.CLOUD_DB.prepare(
          "INSERT INTO cloud_saves (id, user_id, game_slug, name, object_key, revision, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING"
        )
          .bind(id, user.id, game, name, key, revision, now)
          .run();
    if (!result.meta.changes) {
      await env.CLOUD_SAVES.delete(key);
      throw new ApiError(409, "存档已更新，请刷新列表");
    }
    // Cleanup is best-effort after the pointer is committed. A cleanup outage
    // must not turn a successful save into an apparent failure and duplicate.
    try {
      await pruneVersions(env, {
        id,
        user_id: user.id,
        game_slug: game,
        name,
        object_key: key,
        revision,
        updated_at: now,
        deleted: 0,
      });
    } catch {
      console.warn("cloud-save version cleanup deferred", { id });
    }
    return json({ save: { id, gameSlug: game, name, revision, updatedAt: now } });
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error("cloud-save request failed", {
      path: new URL(request.url).pathname,
      error: error instanceof Error ? error.name : "unknown",
    });
    return json({ error: "云端服务暂时不可用，请重试或保存到本地" }, 503);
  }
}
