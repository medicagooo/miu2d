/**
 * Restore a public game-runtime snapshot into a local PostgreSQL database.
 *
 * AI trace:
 * - Purpose: make the runtime REST APIs independent from the production database after a
 *   snapshot has been downloaded locally.
 * - Entry point: docs/LOCAL_FULLY_LOCAL_DEPLOYMENT.md invokes this script with --snapshot,
 *   --slug, and --game-id while DATABASE_URL points at the local PostgreSQL instance.
 * - Downstream data flow: config.json/data.json/level.json plus the initial scene snapshot are
 *   converted back into games, game_configs, magics, goods, shops, NPC/OBJ resources, players,
 *   talk data, level_configs, and scenes rows consumed by the existing public services.
 * - Side effects and recovery: accepts only a local database host, scopes writes to the
 *   requested game id/slug, and uses per-row upserts without a cross-table transaction, so an
 *   interrupted run can be resumed. Existing unrelated games and saves are not deleted.
 * - Compatibility boundary: this restores the public runtime model and the captured initial
 *   scene. File-tree rows and additional scenes require their own metadata snapshot.
 */

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

type JsonObject = Record<string, unknown>;

interface ResourceMapEntry {
  path: string;
  storageKey: string;
  size: number;
  mimeType?: string;
  checksum?: string;
}

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(`Invalid arguments near ${key ?? "<end>"}`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function without(source: JsonObject, excluded: readonly string[]): JsonObject {
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(source)) {
    if (!excluded.includes(key)) result[key] = value;
  }
  return result;
}

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

async function upsert(
  client: Client,
  table: string,
  row: JsonObject,
  conflictColumns: readonly string[]
): Promise<void> {
  const columns = Object.keys(row);
  const updateColumns = columns.filter(
    (column) => column !== "id" && !conflictColumns.includes(column)
  );
  const sql = [
    `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")})`,
    `VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`,
    `ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(", ")}) DO UPDATE SET`,
    updateColumns
      .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`)
      .join(", "),
  ].join(" ");
  const values = columns.map((column) => {
    const value = row[column];
    return column === "data" ? JSON.stringify(value) : value;
  });
  await client.query(sql, values);
}

async function upsertMany(
  client: Client,
  table: string,
  rows: JsonObject[],
  conflictColumns: readonly string[]
): Promise<void> {
  for (const row of rows) await upsert(client, table, row, conflictColumns);
  console.log(`${table}: ${rows.length}`);
}

async function restoreFileMap(
  client: Client,
  gameId: string,
  entries: ResourceMapEntry[]
): Promise<void> {
  const nodeIds = new Map<string, string>();
  for (const entry of entries) {
    const segments = entry.path.replace(/\\/g, "/").split("/").filter(Boolean);
    let parentId: string | null = null;
    let currentPath = "";
    for (let index = 0; index < segments.length; index += 1) {
      const name = segments[index];
      currentPath = currentPath ? `${currentPath}/${name.toLowerCase()}` : name.toLowerCase();
      const cachedId = nodeIds.get(currentPath);
      if (cachedId) {
        parentId = cachedId;
        continue;
      }

      const existing = await client.query<{ id: string }>(
        `SELECT id FROM files
         WHERE game_id = $1
           AND parent_id IS NOT DISTINCT FROM $2::uuid
           AND lower(name) = lower($3)
           AND deleted_at IS NULL
         ORDER BY created_at NULLS LAST
         LIMIT 1`,
        [gameId, parentId, name]
      );
      const isFile = index === segments.length - 1;
      const id = existing.rows[0]?.id ?? randomUUID();
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO files
             (id, game_id, parent_id, name, type, storage_key, size, mime_type, checksum)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            gameId,
            parentId,
            name,
            isFile ? "file" : "folder",
            isFile ? entry.storageKey : null,
            isFile ? String(entry.size) : null,
            isFile ? (entry.mimeType ?? null) : null,
            isFile ? (entry.checksum ?? null) : null,
          ]
        );
      } else if (isFile) {
        await client.query(
          `UPDATE files
           SET type = 'file', storage_key = $2, size = $3, mime_type = $4,
               checksum = $5, deleted_at = NULL, updated_at = now()
           WHERE id = $1`,
          [id, entry.storageKey, String(entry.size), entry.mimeType ?? null, entry.checksum ?? null]
        );
      }
      nodeIds.set(currentPath, id);
      parentId = id;
    }
  }
  console.log(`files: ${entries.length} mapped resources`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const snapshotArg = args.snapshot;
  const slug = args.slug;
  const gameId = args["game-id"];
  const databaseUrl = process.env.DATABASE_URL;
  if (!snapshotArg || !slug || !gameId || !databaseUrl) {
    throw new Error("Required: --snapshot, --slug, --game-id, and DATABASE_URL");
  }
  const databaseHost = new URL(databaseUrl).hostname.toLowerCase();
  if (!new Set(["localhost", "127.0.0.1", "[::1]", "::1", "db", "host.docker.internal"]).has(databaseHost)) {
    throw new Error(`Refusing to restore into non-local database host: ${databaseHost}`);
  }
  const snapshotDir = path.resolve(snapshotArg);

  const config = await readJson<JsonObject>(path.join(snapshotDir, "config.json"));
  const data = await readJson<JsonObject>(path.join(snapshotDir, "data.json"));
  const level = await readJson<JsonObject>(path.join(snapshotDir, "level.json"));
  const initialMap = String(config.initialMap ?? "");
  const initialNpc = String(config.initialNpc ?? "");
  const initialObj = String(config.initialObj ?? "");
  const sceneKey = path.basename(initialMap).replace(/\.(mmf|map)$/i, "");
  if (!sceneKey || !initialMap) throw new Error("Snapshot has no initialMap");

  const manifest = await readJson<JsonObject>(
    path.join(snapshotDir, `${sceneKey}.manifest.json`)
  );
  const npcEntries = await readJson<unknown[]>(path.join(snapshotDir, `${sceneKey}.npc.json`));
  const objEntries = await readJson<unknown[]>(path.join(snapshotDir, `${sceneKey}.obj.json`));
  const mmfData = (await readFile(path.join(snapshotDir, `${sceneKey}.mmf`))).toString("base64");

  const magics = data.magics as { player?: JsonObject[]; npc?: JsonObject[] };
  const npcs = data.npcs as { npcs?: JsonObject[]; resources?: JsonObject[] };
  const objs = data.objs as { objs?: JsonObject[]; resources?: JsonObject[] };
  const players = (data.players ?? []) as JsonObject[];
  const goods = (data.goods ?? []) as JsonObject[];
  const shops = (data.shops ?? []) as JsonObject[];
  const portraits = (data.portraits ?? []) as Array<{ index: number; asfFile: string }>;
  const talks = (data.talks ?? []) as unknown[];
  const levels = [
    ...(((level.player ?? []) as JsonObject[]) ?? []),
    ...(((level.npc ?? []) as JsonObject[]) ?? []),
  ];

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const conflict = await client.query<{ id: string; slug: string }>(
      "SELECT id, slug FROM games WHERE id = $1 OR slug = $2",
      [gameId, slug]
    );
    if (
      conflict.rows.some(
        (row) => (row.id === gameId && row.slug !== slug) || (row.slug === slug && row.id !== gameId)
      )
    ) {
      throw new Error(`Game id/slug conflict for ${gameId} / ${slug}`);
    }

    await upsert(
      client,
      "games",
      {
        id: gameId,
        slug,
        name: String(config.gameName ?? slug),
        description: String(config.gameDescription ?? ""),
      },
      ["id"]
    );

    await upsert(
      client,
      "game_configs",
      { id: randomUUID(), game_id: gameId, data: config },
      ["game_id"]
    );

    const magicRows = [...(magics.player ?? []), ...(magics.npc ?? [])].map((item) => ({
      id: item.id,
      game_id: gameId,
      key: item.key,
      user_type: item.userType,
      name: item.name,
      data: without(item, ["id", "gameId", "key", "userType", "name", "createdAt", "updatedAt"]),
    }));
    await upsertMany(client, "magics", magicRows, ["game_id", "key"]);

    const goodRows = goods.map((item) => ({
      id: item.id,
      game_id: gameId,
      key: item.key,
      kind: item.kind,
      data: without(item, ["id", "gameId", "key", "kind", "createdAt", "updatedAt"]),
    }));
    await upsertMany(client, "goods", goodRows, ["game_id", "key"]);

    const shopRows = shops.map((item) => ({
      id: item.id,
      game_id: gameId,
      key: item.key,
      name: item.name,
      data: without(item, ["id", "gameId", "key", "name", "createdAt", "updatedAt"]),
    }));
    await upsertMany(client, "shops", shopRows, ["game_id", "key"]);

    const npcResourceRows = (npcs.resources ?? []).map((item) => ({
      id: item.id,
      game_id: gameId,
      key: item.key,
      name: item.name,
      data: without(item, ["id", "gameId", "key", "name", "createdAt", "updatedAt"]),
    }));
    await upsertMany(client, "npc_resources", npcResourceRows, ["game_id", "key"]);

    const npcRows = (npcs.npcs ?? []).map((item) => ({
      id: item.id,
      game_id: gameId,
      key: item.key,
      name: item.name,
      kind: item.kind,
      relation: item.relation,
      resource_id: item.resourceId,
      data: without(item, [
        "id",
        "gameId",
        "key",
        "name",
        "kind",
        "relation",
        "resourceId",
        "createdAt",
        "updatedAt",
      ]),
    }));
    await upsertMany(client, "npcs", npcRows, ["game_id", "key"]);

    const objResourceRows = (objs.resources ?? []).map((item) => ({
      id: item.id,
      game_id: gameId,
      key: item.key,
      name: item.name,
      data: without(item, ["id", "gameId", "key", "name", "createdAt", "updatedAt"]),
    }));
    await upsertMany(client, "obj_resources", objResourceRows, ["game_id", "key"]);

    const objRows = (objs.objs ?? []).map((item) => ({
      id: item.id,
      game_id: gameId,
      key: item.key,
      name: item.name,
      kind: item.kind,
      resource_id: item.resourceId,
      data: without(item, [
        "id",
        "gameId",
        "key",
        "name",
        "kind",
        "resourceId",
        "createdAt",
        "updatedAt",
      ]),
    }));
    await upsertMany(client, "objs", objRows, ["game_id", "key"]);

    const playerRows = players.map((item) => ({
      id: item.id,
      game_id: gameId,
      key: item.key,
      name: item.name,
      index: item.index,
      data: without(item, ["id", "gameId", "key", "name", "index", "createdAt", "updatedAt"]),
    }));
    await upsertMany(client, "players", playerRows, ["game_id", "key"]);

    await upsert(
      client,
      "talk_portraits",
      {
        id: randomUUID(),
        game_id: gameId,
        data: portraits.map((entry) => ({ idx: entry.index, file: entry.asfFile })),
      },
      ["game_id"]
    );
    await upsert(
      client,
      "talks",
      { id: randomUUID(), game_id: gameId, data: talks },
      ["game_id"]
    );

    const levelRows = levels.map((item) => ({
      id: item.id,
      game_id: gameId,
      key: item.key,
      name: item.name,
      user_type: item.userType,
      max_level: item.maxLevel,
      data: item.levels,
    }));
    await upsertMany(client, "level_configs", levelRows, ["game_id", "key"]);

    await upsert(
      client,
      "scenes",
      {
        id: randomUUID(),
        game_id: gameId,
        key: sceneKey,
        name: sceneKey,
        map_file_name: initialMap,
        mmf_data: mmfData,
        data: {
          scripts: manifest.scripts ?? {},
          traps: manifest.traps ?? {},
          npc: initialNpc ? { [initialNpc]: { key: initialNpc, entries: npcEntries } } : {},
          obj: initialObj ? { [initialObj]: { key: initialObj, entries: objEntries } } : {},
        },
      },
      ["game_id", "key"]
    );

    try {
      const resourceMap = await readJson<{ entries: ResourceMapEntry[] }>(
        path.join(snapshotDir, "resource-map.json")
      );
      await restoreFileMap(client, gameId, resourceMap.entries);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
      console.log("files: resource-map.json not present; skipped");
    }

    console.log(`restored game ${slug} (${gameId}), initial scene ${sceneKey}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
