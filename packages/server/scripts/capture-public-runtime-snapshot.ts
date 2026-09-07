/**
 * Capture the public runtime payload and initial scene for one game.
 *
 * AI trace:
 * - Purpose: create the input consumed by restore-local-runtime-snapshot.ts when a production
 *   PostgreSQL dump is unavailable but the public runtime endpoints are still readable.
 * - Entry point: docs/LOCAL_FULLY_LOCAL_DEPLOYMENT.md invokes this script with --source-base,
 *   --slug, and --output; config.initialMap/initialNpc/initialObj select the scene endpoints.
 * - Downstream data flow: public config/data/level and initial-scene responses -> ignored local
 *   snapshot directory -> restore-local-runtime-snapshot.ts -> local PostgreSQL runtime rows.
 * - Side effects and recovery: performs GET requests only against the source and writes only the
 *   requested local directory. Runtime payloads are refreshed on rerun, while an existing
 *   extra-resource-paths.json is preserved because it contains locally observed resource paths.
 * - Compatibility boundary: captures one initial scene, not the complete production files tree
 *   or all scenes. UUID object-path metadata still requires capture-local-resource-map.ts.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type JsonObject = Record<string, unknown>;

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

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function snapshotFileName(value: string): string {
  const name = path.basename(value).replace(/\.(mmf|map)$/i, "");
  if (!name || /[<>:"/\\|?*\u0000-\u001f]/.test(name)) {
    throw new Error(`Unsafe initial scene name: ${value}`);
  }
  return name;
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (response.ok) return response;
      lastError = new Error(`GET ${url}: HTTP ${response.status}`);
      if (response.status < 500) break;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  throw lastError;
}

async function fetchJson<T>(url: string): Promise<T> {
  return (await (await fetchWithRetry(url)).json()) as T;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeJsonIfMissing(filePath: string, value: unknown): Promise<void> {
  try {
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sourceBase = args["source-base"]?.replace(/\/+$/, "");
  const slug = args.slug;
  const outputArg = args.output;
  if (!sourceBase || !slug || !outputArg) {
    throw new Error("Required: --source-base, --slug, and --output");
  }

  const outputDir = path.resolve(outputArg);
  const apiBase = `${sourceBase}/game/${encodePathSegment(slug)}/api`;
  const config = await fetchJson<JsonObject>(`${apiBase}/config`);
  const data = await fetchJson<JsonObject>(`${apiBase}/data`);
  const level = await fetchJson<JsonObject>(`${apiBase}/level`);
  const initialMap = String(config.initialMap ?? "");
  const initialNpc = String(config.initialNpc ?? "");
  const initialObj = String(config.initialObj ?? "");
  if (!initialMap) throw new Error(`Game ${slug} has no initialMap`);

  const sceneKey = snapshotFileName(initialMap);
  const encodedScene = encodePathSegment(sceneKey);
  const manifest = await fetchJson<JsonObject>(`${apiBase}/scenes/${encodedScene}/manifest`);
  const mmf = Buffer.from(
    await (await fetchWithRetry(`${apiBase}/scenes/${encodedScene}/mmf`)).arrayBuffer()
  );
  const npc = initialNpc
    ? await fetchJson<unknown[]>(
        `${apiBase}/scenes/npc/${encodedScene}/${encodePathSegment(initialNpc)}`
      )
    : [];
  const obj = initialObj
    ? await fetchJson<unknown[]>(
        `${apiBase}/scenes/obj/${encodedScene}/${encodePathSegment(initialObj)}`
      )
    : [];

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeJson(path.join(outputDir, "config.json"), config),
    writeJson(path.join(outputDir, "data.json"), data),
    writeJson(path.join(outputDir, "level.json"), level),
    writeJson(path.join(outputDir, `${sceneKey}.manifest.json`), manifest),
    writeJson(path.join(outputDir, `${sceneKey}.npc.json`), npc),
    writeJson(path.join(outputDir, `${sceneKey}.obj.json`), obj),
    writeFile(path.join(outputDir, `${sceneKey}.mmf`), mmf),
    writeJsonIfMissing(path.join(outputDir, "extra-resource-paths.json"), []),
  ]);

  console.log(
    `captured ${slug}: ${sceneKey}, ${mmf.length} MMF bytes, ${npc.length} NPC entries, ${obj.length} OBJ entries -> ${outputDir}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
