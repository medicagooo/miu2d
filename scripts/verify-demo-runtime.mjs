import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(realpathSync(new URL("../node_modules/wrangler/package.json", import.meta.url)));
const { Miniflare, convertV4MiniflareOptions } = require("miniflare");
const runtime = new Miniflare(convertV4MiniflareOptions({
  modules: true,
  scriptPath: fileURLToPath(new URL("../.wrangler/demo-dry-run/worker-demo.js", import.meta.url)),
  compatibilityDate: "2026-09-08",
  serviceBindings: { ASSETS: (req) => new Response(`asset:${new URL(req.url).pathname}`) },
  outboundService: (req) => {
    if (req.url.endsWith("/api/manifest")) return Response.json({ icons: [{ src: "/s3/private/key", sizes: "192x192" }] });
    if (req.url.endsWith("/redirect")) return new Response(null, { status: 302, headers: { location: "https://other.invalid" } });
    return Response.json({ url: req.url, cookie: req.headers.get("cookie"), auth: req.headers.get("authorization"), range: req.headers.get("range") }, {
      status: req.headers.has("range") ? 206 : 200,
      headers: { "set-cookie": "secret=upstream", "content-range": "bytes 0-9/100" },
    });
  },
}));
try {
  assert.equal((await (await runtime.dispatchFetch("https://test.invalid/health")).json()).mode, "public-games");
  for (const slug of ["demo", "sword1", "sword2"]) {
    for (const type of ["api/config", "resources/music.ogg"]) {
      const path = `/game/${slug}/${type}?version=1`;
      const r = await runtime.dispatchFetch(`https://test.invalid${path}`, { headers: { cookie: "private", authorization: "Bearer private", range: "bytes=0-9" } });
      assert.equal(r.status, 206);
      assert.equal(r.headers.get("set-cookie"), null);
      assert.equal(r.headers.get("content-range"), "bytes 0-9/100");
      assert.deepEqual(await r.json(), { url: `https://miu2d.com${path}`, cookie: null, auth: null, range: "bytes=0-9" });
    }
    assert.equal(await (await runtime.dispatchFetch(`https://test.invalid/game/${slug}`)).text(), `asset:/game/${slug}`);
  }
  for (const path of ["/trpc/user.getProfile", "/s3/a", "/game/private/api/config"]) {
    assert.equal((await runtime.dispatchFetch(`https://test.invalid${path}`)).status, 404);
  }
  assert.equal((await runtime.dispatchFetch("https://test.invalid/game/demo/api/config", { method: "POST", body: "private" })).status, 405);
  assert.equal((await runtime.dispatchFetch("https://test.invalid/game/demo/api/redirect")).status, 502);
  const manifest = await (await runtime.dispatchFetch("https://test.invalid/game/demo/api/manifest")).json();
  assert.equal(manifest.icons[0].src, "/game/demo/api/logo/192");
  console.log("Public Worker: three games, query/range preservation, credential isolation, write/unknown/redirect rejection and SPA routing passed.");
} finally { await runtime.dispose(); }
