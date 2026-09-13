/**
 * Public demo deployment: GameScreen/engine keep their same-origin /game URLs.
 * Only the three landing games can read the original public API/resources.
 * Cloud player accounts/saves are handled locally via D1/R2, never proxied.
 * No database, account cookies or administrative writes are sent upstream.
 * The full backend remains available through worker.ts and the Node entrypoint.
 */
import { cloudSaveApi } from "./cloud-save/api";

export default {
  async fetch(request: Request, env: CloudSaveEnv): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith("/cloud-save/v1/")) return cloudSaveApi(request, env);
    if (path.startsWith("/cloud-save/")) return Response.json({ error: "Not found" }, { status: 404 });
    if (request.method !== "GET" && request.method !== "HEAD") {
      return Response.json({ error: "Public games support read requests only" }, {
        status: 405, headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
      });
    }
    if (path === "/health") return Response.json({ status: "ok", runtime: "workers", mode: "public-games" });
    if (path === "/site-region") return Response.json({ suggestDomestic: false });
    if (/^\/game\/(demo|sword1|sword2)\/(api|resources)\//.test(path)) {
      const target = new URL(path + url.search, "https://miu2d.com");
      const headers = new Headers();
      for (const name of ["accept", "range", "if-range", "if-none-match", "if-modified-since"]) {
        const value = request.headers.get(name);
        if (value) headers.set(name, value);
      }
      try {
        // Manual redirects prevent a remote redirect from becoming an open proxy.
        const upstream = await fetch(target, { method: request.method, headers, redirect: "manual" });
        if (upstream.status >= 300 && upstream.status < 400 && upstream.status !== 304) {
          return Response.json({ error: "Unexpected upstream redirect" }, { status: 502 });
        }
        // The source manifest contains its S3 URLs; public demo icons use the
        // game's existing logo endpoint so installation stays on this origin.
        if (request.method === "GET" && upstream.ok && /^\/game\/(demo|sword1|sword2)\/api\/manifest$/.test(path)) {
          const manifest = await upstream.json() as { icons?: Array<{ src: string; sizes?: string }> };
          for (const icon of manifest.icons ?? []) {
            icon.src = `${path.slice(0, -"manifest".length)}logo/${icon.sizes === "192x192" ? "192" : "512"}`;
          }
          return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" } });
        }
        const response = new Response(upstream.body, upstream);
        response.headers.delete("set-cookie");
        response.headers.delete("access-control-allow-credentials");
        return response;
      } catch {
        console.error("Public game upstream request failed", path);
        return Response.json({ error: "Game service unavailable" }, { status: 502 });
      }
    }
    if (/^\/(trpc|s3)(\/|$)/.test(path) || /^\/game\/[^/]+\/(api|resources)(\/|$)/.test(path)) {
      return Response.json({ error: "Unavailable in public game deployment" }, {
        status: 404, headers: { "Cache-Control": "no-store" },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
