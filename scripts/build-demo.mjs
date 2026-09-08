import { spawnSync } from "node:child_process";

// This explicit mode preserves the default full-backend build for existing hosts.
const result = spawnSync(process.execPath, [process.env.npm_execpath, "build:web"], {
  stdio: "inherit", env: { ...process.env, VITE_DEMO_ONLY: "true", VITE_DEMO_RESOURCES_DOMAIN: "" },
});
process.exit(result.status ?? 1);
