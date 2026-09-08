import { DurableObject } from "cloudflare:workers";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { app } from "./app";
import { env } from "./env";
import { runtimeContext } from "./runtime/context";

/** One durable counter per hashed route/IP. Fixed windows match the Node limiter. */
export class AuthRateLimit extends DurableObject<Env> {
  async consume(max: number, windowMs: number): Promise<number> {
    return this.ctx.blockConcurrencyWhile(async () => {
      const now = Date.now();
      let record = await this.ctx.storage.get<{ count: number; resetAt: number }>("window");
      if (!record || record.resetAt <= now) record = { count: 0, resetAt: now + windowMs };
      if (record.count >= max) return Math.ceil((record.resetAt - now) / 1000);
      record.count++;
      await this.ctx.storage.put("window", record);
      await this.ctx.storage.setAlarm(record.resetAt);
      return 0;
    });
  }
  async alarm() {
    await this.ctx.blockConcurrencyWhile(async () => {
      const record = await this.ctx.storage.get<{ resetAt: number }>("window");
      // A delayed alarm from the previous window must not erase a fresh counter.
      if (!record || record.resetAt <= Date.now()) await this.ctx.storage.deleteAll();
      else await this.ctx.storage.setAlarm(record.resetAt);
    });
  }
}

function isBackend(path: string): boolean {
  return (
    path === "/health" ||
    path.startsWith("/health/") ||
    path === "/trpc" ||
    path.startsWith("/trpc/") ||
    /^\/game\/[^/]+\/(api|resources)(\/|$)/.test(path)
  );
}

export default {
  async fetch(request, bindings, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/site-region") {
      return Response.json(
        { suggestDomestic: request.cf?.country === "CN" },
        {
          headers: { "Cache-Control": "private, no-store" },
        }
      );
    }
    if (url.pathname.startsWith("/s3/")) {
      // Same-origin presigned paths must preserve the endpoint host used by signing.
      // Forward only object access to the configured endpoint, never an arbitrary URL.
      if (!["GET", "HEAD", "PUT"].includes(request.method))
        return new Response("Method not allowed", { status: 405 });
      const target = new URL(env.s3Endpoint);
      // The public URL already contains the exact signed endpoint path.
      target.pathname = url.pathname.slice(3);
      target.search = url.search;
      const headers = new Headers(request.headers);
      headers.delete("cookie");
      headers.delete("authorization");
      headers.delete("host");
      const upstream = await fetch(target, {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "manual",
      });
      const result = new Response(upstream.body, upstream);
      result.headers.delete("set-cookie");
      result.headers.set("Cache-Control", "private, no-store");
      return result;
    }
    if (!isBackend(url.pathname)) return bindings.ASSETS.fetch(request);
    if (url.pathname === "/health") return Response.json({ status: "ok", runtime: "workers" });

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: bindings.HYPERDRIVE.connectionString }),
    });
    // CF-Connecting-IP is supplied by Cloudflare, not an untrusted forwarding chain.
    const headers = new Headers(request.headers);
    headers.set("x-forwarded-for", request.headers.get("cf-connecting-ip") ?? "unknown");
    const scopedRequest = new Request(request, { headers });
    const pending: Promise<unknown>[] = [];
    try {
      return await runtimeContext.run(
        {
          db: client,
          background: (task) => {
            pending.push(task);
          },
          images: {
            async metadata(bytes) {
              const info = await bindings.IMAGES.info(new Response(new Uint8Array(bytes)).body!);
              return "width" in info ? { width: info.width, height: info.height } : {};
            },
            async resize(bytes, size) {
              const output = await bindings.IMAGES.input(new Response(new Uint8Array(bytes)).body!)
                .transform({ width: size, height: size, fit: "cover" })
                .output({ format: "image/png" });
              return Buffer.from(await output.response().arrayBuffer());
            },
          },
          async rateLimit(key, max, windowMs) {
            const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
            const name = Array.from(new Uint8Array(digest), (v) =>
              v.toString(16).padStart(2, "0")
            ).join("");
            return bindings.AUTH_RATE_LIMIT.getByName(name).consume(max, windowMs);
          },
        },
        () => app.fetch(scopedRequest)
      );
    } catch (error) {
      console.error("Worker request failed", error instanceof Error ? error.name : "UnknownError");
      return Response.json(
        { error: "Internal server error" },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    } finally {
      // Email-token jobs share this request's client; close it only after they finish.
      ctx.waitUntil(Promise.allSettled(pending).then(() => client.$disconnect()));
    }
  },
} satisfies ExportedHandler<Env>;
