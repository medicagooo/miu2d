import assert from "node:assert/strict";
import { test } from "node:test";
import { isSaveData, LOCAL_SAVE_FORMAT } from "@miu2d/types";
import worker from "../worker-demo";
import { cloudSaveApi } from "./api";

// Binding fakes deliberately use Maps, never SQLite/Miniflare D1: this project
// forbids creating local databases. Real D1/R2 verification is a deployment gate.
type Row = Record<string, string | number>;
class FakeDb {
  players = new Map<string, Row>();
  sessions = new Map<string, Row>();
  saves = new Map<string, Row>();
  schema = 0;
  failWrite: "before" | "after" | null = null;
  prepare(sql: string) {
    const q = sql.replace(/\s+/g, " ").trim();
    let values: Array<string | number> = [];
    const first = async () => {
      if (q.includes("sqlite_master")) return this.schema ? { name: "cloud_schema" } : null;
      if (q.startsWith("SELECT version")) return { version: this.schema };
      if (q.includes("JOIN cloud_players")) {
        const session = this.sessions.get(String(values[0]));
        if (!session || Number(session.expires_at) <= Number(values[1])) return null;
        const p = this.players.get(String(session.user_id));
        return p ? { id: p.id, name: p.name, email: p.email } : null;
      }
      if (q.includes("FROM cloud_players"))
        return [...this.players.values()].find((p) => p.email === values[0]) ?? null;
      if (q.includes("FROM cloud_saves")) {
        const row = this.saves.get(String(values[0]));
        if (
          !row ||
          (values.length >= 3 && (row.user_id !== values[1] || row.game_slug !== values[2])) ||
          (q.includes("deleted = 0") && row.deleted)
        )
          return null;
        return { ...row };
      }
      throw new Error(`Unimplemented first: ${q}`);
    };
    const run = async () => {
      let changes = 1;
      const writeSave =
        q.startsWith("UPDATE cloud_saves SET name") || q.startsWith("INSERT INTO cloud_saves");
      if (writeSave && this.failWrite === "before") {
        this.failWrite = null;
        throw new Error("D1 unavailable");
      }
      if (q.startsWith("CREATE")) {
        /* no database is created */
      } else if (q.startsWith("INSERT INTO cloud_schema")) this.schema = 1;
      else if (q.startsWith("INSERT INTO cloud_players")) {
        if ([...this.players.values()].some((p) => p.email === values[1])) changes = 0;
        else
          this.players.set(String(values[0]), {
            id: values[0],
            email: values[1],
            name: values[2],
            password_hash: values[3],
            created_at: values[4],
          });
      } else if (q.startsWith("INSERT INTO cloud_sessions")) {
        this.sessions.set(String(values[0]), { user_id: values[1], expires_at: values[2] });
      } else if (q.startsWith("DELETE FROM cloud_sessions")) {
        if (q.includes("token_hash")) this.sessions.delete(String(values[0]));
        else
          for (const [key, row] of this.sessions)
            if (Number(row.expires_at) <= Number(values[0])) this.sessions.delete(key);
      } else if (q.startsWith("INSERT INTO cloud_saves")) {
        if (this.saves.has(String(values[0]))) changes = 0;
        else
          this.saves.set(String(values[0]), {
            id: values[0],
            user_id: values[1],
            game_slug: values[2],
            name: values[3],
            object_key: values[4],
            revision: values[5],
            updated_at: values[6],
            deleted: 0,
          });
      } else if (q.startsWith("UPDATE cloud_saves SET name")) {
        const row = this.saves.get(String(values[4]));
        if (!row || row.user_id !== values[5] || row.revision !== values[6] || row.deleted)
          changes = 0;
        else
          Object.assign(row, {
            name: values[0],
            object_key: values[1],
            revision: values[2],
            updated_at: values[3],
          });
      } else if (q.startsWith("UPDATE cloud_saves SET deleted")) {
        const row = this.saves.get(String(values[0]));
        if (!row || row.user_id !== values[1] || row.revision !== values[2] || row.deleted)
          changes = 0;
        else row.deleted = 1;
      } else throw new Error(`Unimplemented run: ${q}`);
      if (writeSave && this.failWrite === "after") {
        this.failWrite = null;
        throw new Error("response lost after commit");
      }
      return { success: true, meta: { changes } };
    };
    return {
      bind(...args: Array<string | number>) {
        values = args;
        return this;
      },
      first,
      run,
      all: async () => ({
        results: [...this.saves.values()]
          .filter((r) => r.user_id === values[0] && r.game_slug === values[1] && !r.deleted)
          .sort((a, b) => Number(b.updated_at) - Number(a.updated_at)),
      }),
    };
  }
}
class FakeBucket {
  objects = new Map<string, { body: string; uploaded: Date }>();
  failPut = false;
  failDelete = false;
  async put(key: string, body: string) {
    if (this.failPut) throw new Error("R2 unavailable");
    this.objects.set(key, { body, uploaded: new Date() });
  }
  async get(key: string) {
    const item = this.objects.get(key);
    return item ? { body: item.body } : null;
  }
  async delete(key: string) {
    if (this.failDelete) throw new Error("R2 delete unavailable");
    this.objects.delete(key);
  }
  async list(options: { prefix?: string }) {
    return {
      truncated: false,
      objects: [...this.objects]
        .filter(([key]) => key.startsWith(options.prefix ?? ""))
        .map(([key, item]) => ({ key, uploaded: item.uploaded })),
    };
  }
}
const data = { version: 1, player: { name: "玩家" }, state: { map: "test" }, snapshot: {} };
function fixture() {
  const db = new FakeDb();
  const bucket = new FakeBucket();
  const limit = {
    allowed: true,
    async limit() {
      return { success: this.allowed };
    },
  };
  const env = {
    CLOUD_DB: db,
    CLOUD_SAVES: bucket,
    CLOUD_AUTH_LIMIT: limit,
    CLOUD_WRITE_LIMIT: limit,
  } as unknown as CloudSaveEnv;
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    cookie = "",
    origin = "https://game.test"
  ) =>
    cloudSaveApi(
      new Request(`https://game.test/cloud-save/v1${path}`, {
        method,
        headers: {
          origin,
          cookie,
          "content-type": "application/json",
          "cf-connecting-ip": "192.0.2.1",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      env
    );
  const register = async (email: string) => {
    const response = await request("/auth/register", "POST", {
      email,
      name: "玩家",
      password: "a-long-test-password",
    });
    assert.equal(response.status, 200, await response.clone().text());
    const cookie = response.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/);
    return cookie.split(";")[0];
  };
  return { db, bucket, limit, env, request, register };
}

test("anonymous/local compatibility, malformed input, method, origin and rate guards", async () => {
  const f = fixture();
  assert.equal(isSaveData(data), true);
  assert.equal(isSaveData({ ...data, snapshot: [] }), false);
  assert.equal((await f.request("/auth/session")).status, 200);
  assert.equal((await f.request("/saves?game=demo")).status, 401);
  assert.equal(
    (await f.request("/auth/register", "POST", {}, "", "https://evil.test")).status,
    403
  );
  assert.equal(
    (await f.request("/auth/register", "POST", { email: "bad", password: "12345678" })).status,
    400
  );
  f.limit.allowed = false;
  assert.equal((await f.request("/auth/login", "POST", {})).status, 429);
  assert.equal(
    (await worker.fetch(new Request("https://game.test/cloud-save/unknown"), f.env)).status,
    404
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://game.test/game/demo/api/config", { method: "POST" }),
        f.env
      )
    ).status,
    405
  );
});

test("registration, hashed credentials/session, case-normalized login, logout and expiry", async () => {
  const f = fixture();
  const cookie = await f.register("Player@Example.test");
  const p = [...f.db.players.values()][0];
  assert.equal(p.email, "player@example.test");
  assert.match(String(p.password_hash), /^\$2[ab]\$12\$/);
  assert.notEqual([...f.db.sessions.keys()][0], cookie.split("=")[1]);
  assert.equal((await f.request("/auth/session", "GET", undefined, cookie)).status, 200);
  assert.equal(
    (
      await f.request("/auth/register", "POST", {
        email: "player@example.test",
        password: "a-long-test-password",
        name: "duplicate",
      })
    ).status,
    409
  );
  assert.equal(
    (
      await f.request("/auth/login", "POST", {
        email: "PLAYER@example.test",
        password: "wrong-password",
      })
    ).status,
    401
  );
  const login = await f.request("/auth/login", "POST", {
    email: "PLAYER@example.test",
    password: "a-long-test-password",
  });
  assert.equal(login.status, 200);
  assert.equal((await f.request("/auth/logout", "POST", {}, cookie)).status, 200);
  assert.deepEqual(await (await f.request("/auth/session", "GET", undefined, cookie)).json(), {
    user: null,
  });
  for (const row of f.db.sessions.values()) row.expires_at = 0;
  assert.deepEqual(
    await (
      await f.request(
        "/auth/session",
        "GET",
        undefined,
        login.headers.get("set-cookie")!.split(";")[0]
      )
    ).json(),
    { user: null }
  );
});

test("cloud round trip, owner/game isolation, concurrent revision conflict and deletion", async () => {
  const f = fixture();
  const a = await f.register("a@example.test");
  const b = await f.register("b@example.test");
  const id = crypto.randomUUID();
  const path = `/saves/${id}?game=demo`;
  assert.equal((await f.request(path, "PUT", { name: "初始", revision: 0, data }, a)).status, 200);
  assert.deepEqual(await (await f.request(path, "GET", undefined, a)).json(), {
    format: LOCAL_SAVE_FORMAT,
    gameSlug: "demo",
    data,
  });
  assert.equal((await f.request(path, "GET", undefined, b)).status, 404);
  assert.equal(
    (await f.request(path, "PUT", { name: "stolen", revision: 1, data }, b)).status,
    404
  );
  assert.equal((await f.request(`/saves/${id}?game=sword1`, "GET", undefined, a)).status, 404);
  assert.equal((await f.request("/saves?game=private", "GET", undefined, a)).status, 400);
  const results = await Promise.all(
    [1, 2].map((n) => f.request(path, "PUT", { name: `保存${n}`, revision: 1, data }, a))
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await f.request(path, "DELETE", { revision: 1 }, a)).status, 409);
  assert.equal((await f.request(path, "DELETE", { revision: 2 }, a)).status, 200);
  assert.equal((await f.request(path, "DELETE", { revision: 2 }, a)).status, 200);
  assert.equal((await f.request(path, "GET", undefined, a)).status, 404);
  assert.equal(f.bucket.objects.size, 0);
});

test("R2 and ambiguous D1 failures never destroy a committed snapshot; delete can resume", async () => {
  const f = fixture();
  const cookie = await f.register("failure@example.test");
  const id = crypto.randomUUID();
  const path = `/saves/${id}?game=demo`;
  await f.request(path, "PUT", { name: "old", revision: 0, data }, cookie);
  const oldKey = f.db.saves.get(id)!.object_key;
  f.bucket.failPut = true;
  assert.equal(
    (await f.request(path, "PUT", { name: "new", revision: 1, data }, cookie)).status,
    503
  );
  assert.equal(f.db.saves.get(id)!.object_key, oldKey);
  f.bucket.failPut = false;
  f.db.failWrite = "before";
  assert.equal(
    (await f.request(path, "PUT", { name: "new", revision: 1, data }, cookie)).status,
    503
  );
  assert.equal(f.db.saves.get(id)!.object_key, oldKey);
  f.db.failWrite = "after";
  assert.equal(
    (await f.request(path, "PUT", { name: "committed", revision: 1, data }, cookie)).status,
    503
  );
  const currentKey = String(f.db.saves.get(id)!.object_key);
  assert.notEqual(currentKey, oldKey);
  assert.equal(f.bucket.objects.has(currentKey), true);
  assert.equal((await f.request(path, "GET", undefined, cookie)).status, 200);
  f.bucket.failDelete = true;
  assert.equal((await f.request(path, "DELETE", { revision: 2 }, cookie)).status, 503);
  f.bucket.failDelete = false;
  assert.equal((await f.request(path, "DELETE", { revision: 2 }, cookie)).status, 200);
  assert.equal(f.bucket.objects.size, 0);
});
