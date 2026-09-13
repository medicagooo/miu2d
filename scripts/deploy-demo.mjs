import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Generic deployment entrypoint; account configuration and credentials belong
// to Wrangler's authenticated environment, never the application or repository.
// Deployment provisions missing bindings. Additive initialization is resumable:
// a failed step exits nonzero; rerunning reuses bindings and existing player data.
const root = fileURLToPath(new URL("../", import.meta.url));
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run([process.env.npm_execpath, "build:demo"]);
const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
run([wrangler, "deploy", "--config", "wrangler.demo.jsonc"]);
// Same schema as the Worker's first-request initializer; publish is not reported
// complete until every statement succeeds. No local database is ever created.
const schema = JSON.parse(readFileSync(new URL("../packages/server/src/cloud-save/schema.json", import.meta.url), "utf8"));
for (const sql of schema) run([wrangler, "d1", "execute", "CLOUD_DB", "--remote", "--config", "wrangler.demo.jsonc", "--command", sql]);
