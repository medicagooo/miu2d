import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(realpathSync(new URL("../node_modules/wrangler/package.json", import.meta.url)));
const { Miniflare, convertV4MiniflareOptions } = require("miniflare");

// Real workerd runtime, without any database, storage namespace or persistence.
// Hyperdrive is an inert config stub; these checks never query PostgreSQL.
const runtime = new Miniflare(convertV4MiniflareOptions({
  modules: true,
  scriptPath: fileURLToPath(new URL("../.wrangler/dry-run/worker.js", import.meta.url)),
  compatibilityDate: "2026-09-08",
  compatibilityFlags: ["nodejs_compat"],
  bindings: {
    NODE_ENV: "production", SESSION_COOKIE_SECURE: "true",
    S3_ENDPOINT: "https://storage.invalid/s3", S3_PUBLIC_ENDPOINT: "/s3",
    HYPERDRIVE: { connectionString: "postgresql://unused:unused@127.0.0.1:1/unused" },
  },
  serviceBindings: {
    ASSETS: (request) => new Response(`asset:${new URL(request.url).pathname}`),
  },
  outboundService: (request) => Response.json({ url: request.url, cookie: request.headers.get("cookie"), authorization: request.headers.get("authorization") }),
}));
try {
  const health = await runtime.dispatchFetch("https://test.invalid/health");
  assert.deepEqual(await health.json(), { status: "ok", runtime: "workers" });
  for (const path of ["/", "/game/sword1", "/game/demo/share/test", "/dashboard/game", "/assets/app.js"]) {
    assert.equal(await (await runtime.dispatchFetch(`https://test.invalid${path}`)).text(), `asset:${path}`);
  }
  const anonymous = await runtime.dispatchFetch("https://test.invalid/trpc/user.getProfile");
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get("cache-control"), /no-store/);
  const unknown = await runtime.dispatchFetch("https://test.invalid/trpc/doesNotExist");
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get("content-type"), /json/);
  const logout = await runtime.dispatchFetch("https://test.invalid/trpc/auth.logout", {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}",
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /SESSION_ID=.*Max-Age=0/);
  assert.match(logout.headers.get("set-cookie"), /Secure/);
  const object = await runtime.dispatchFetch("https://test.invalid/s3/s3/bucket/key?X-Amz-Signature=example", {
    headers: { cookie: "SESSION_ID=private", authorization: "Bearer private" },
  });
  assert.deepEqual(await object.json(), { url: "https://storage.invalid/s3/bucket/key?X-Amz-Signature=example", cookie: null, authorization: null });
  assert.equal((await runtime.dispatchFetch("https://test.invalid/s3/bucket/key", { method: "DELETE" })).status, 405);
  console.log("Worker runtime: health, SPA routing, anonymous authorization, API 404 and logout cookies passed. No database used.");
} finally { await runtime.dispose(); }
