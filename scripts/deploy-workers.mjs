import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// GitHub/Workers Builds supplies the existing Hyperdrive ID; credentials remain in
// Cloudflare Secrets. Fail closed rather than deploying the dry-run placeholder.
const id = process.env.CLOUDFLARE_HYPERDRIVE_ID;
if (!id || !/^[a-f0-9]{32}$/i.test(id) || /^0+$/.test(id)) {
  throw new Error("Set CLOUDFLARE_HYPERDRIVE_ID to the approved existing database binding");
}
const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
config.hyperdrive[0].id = id;
const target = new URL("../wrangler.deploy.local.json", import.meta.url);
writeFileSync(target, JSON.stringify(config, null, 2));
try {
  const cli = new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url);
  const result = spawnSync(process.execPath, [fileURLToPath(cli), "deploy", "--config", fileURLToPath(target)], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally { unlinkSync(target); }
