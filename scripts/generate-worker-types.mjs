import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Point type generation at source so Durable Object RPC types work before a build.
const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
config.main = "packages/server/src/worker.ts";
const target = new URL("../wrangler.types.local.json", import.meta.url);
writeFileSync(target, JSON.stringify(config, null, 2));
try {
  const result = spawnSync(process.execPath, [
    fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)),
    "types", "worker-configuration.d.ts", "--config", fileURLToPath(target),
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally { unlinkSync(target); }
