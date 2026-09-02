/**
 * Capture original-path to UUID-storage-key mappings for a local S3 backup.
 *
 * AI trace:
 * - Purpose: rebuild the minimum `files` metadata lost when an S3-only backup retains UUID
 *   object keys but not PostgreSQL path rows.
 * - Entry point: docs/LOCAL_FULLY_LOCAL_DEPLOYMENT.md provides a public source endpoint, a
 *   local raw S3 backup directory, a scene manifest, and extra runtime paths observed during
 *   testing.
 * - Data flow: source HEAD ETag/length -> local backup MD5 match -> resource-map.json ->
 *   restore-local-runtime-snapshot.ts -> hierarchical `files` rows -> FileRoutes -> local MinIO.
 * - Side effects: only writes the requested local JSON output; it never changes S3 or a database.
 * - Compatibility boundary: only paths supplied by the manifest/extras are captured. An exact
 *   full file tree still requires a PostgreSQL metadata backup.
 */

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

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
    if (!key?.startsWith("--") || !value) throw new Error(`Invalid arguments near ${key}`);
    args[key.slice(2)] = value;
  }
  return args;
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash("md5");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

function encodeResourcePath(resourcePath: string): string {
  return resourcePath.split("/").map(encodeURIComponent).join("/");
}

async function headWithRetry(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.status < 500 || attempt === 3) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 250));
  }
  throw lastError;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sourceBase = args["source-base"]?.replace(/\/+$/, "");
  const slug = args.slug;
  const gameId = args["game-id"];
  const backupArg = args["backup-dir"];
  const manifestArg = args.manifest;
  const extrasArg = args.extras;
  const outputArg = args.output;
  if (!sourceBase || !slug || !gameId || !backupArg || !manifestArg || !extrasArg || !outputArg) {
    throw new Error(
      "Required: --source-base, --slug, --game-id, --backup-dir, --manifest, --extras, --output"
    );
  }
  const backupDir = path.resolve(backupArg);
  const manifestPath = path.resolve(manifestArg);
  const extrasPath = path.resolve(extrasArg);
  const outputPath = path.resolve(outputArg);

  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { tiles?: string[] };
  const extras = JSON.parse(await readFile(extrasPath, "utf8")) as string[];
  const resourcePaths = [...new Set([...(manifest.tiles ?? []), ...extras])].sort();

  const files = (await readdir(backupDir, { withFileTypes: true })).filter((entry) => entry.isFile());
  const bySize = new Map<number, string[]>();
  for (const file of files) {
    const filePath = path.join(backupDir, file.name);
    const size = (await stat(filePath)).size;
    const candidates = bySize.get(size) ?? [];
    candidates.push(filePath);
    bySize.set(size, candidates);
  }

  const hashCache = new Map<string, string>();
  const entries: ResourceMapEntry[] = [];
  for (const resourcePath of resourcePaths) {
    const url = `${sourceBase}/game/${encodeURIComponent(slug)}/resources/${encodeResourcePath(resourcePath)}`;
    const response = await headWithRetry(url);
    if (!response.ok) throw new Error(`HEAD ${resourcePath}: HTTP ${response.status}`);
    const size = Number(response.headers.get("content-length"));
    const checksum = response.headers.get("etag")?.replace(/^\"|\"$/g, "").toLowerCase();
    if (!Number.isSafeInteger(size) || !checksum || !/^[a-f0-9]{32}$/.test(checksum)) {
      throw new Error(`Unsupported source metadata for ${resourcePath}: size=${size}, etag=${checksum}`);
    }

    const candidates = bySize.get(size) ?? [];
    let matchedPath: string | undefined;
    for (const candidate of candidates) {
      let candidateHash = hashCache.get(candidate);
      if (!candidateHash) {
        candidateHash = await hashFile(candidate);
        hashCache.set(candidate, candidateHash);
      }
      if (candidateHash === checksum) {
        matchedPath = candidate;
        break;
      }
    }
    if (!matchedPath) throw new Error(`No local object matches ${resourcePath} (${size}, ${checksum})`);
    entries.push({
      path: resourcePath,
      storageKey: `games/${gameId}/${path.basename(matchedPath)}`,
      size,
      mimeType: response.headers.get("content-type") ?? undefined,
      checksum,
    });
    console.log(`${resourcePath} -> ${path.basename(matchedPath)}`);
  }

  await writeFile(
    outputPath,
    `${JSON.stringify({ gameId, slug, entries }, null, 2)}\n`,
    "utf8"
  );
  console.log(`captured ${entries.length} resource mappings -> ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
