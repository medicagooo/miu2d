import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout } from "node:timers/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Hono } from "hono";
import nativeBcrypt from "bcrypt";
import { db } from "../db/client";
import { getPendingRes, withPendingRes } from "../trpc/context";
import { hashPassword, verifyPassword } from "../utils/password";
import { createRateLimiter } from "../utils/rate-limiter";
import { runtimeContext, type RuntimeContext } from "./context";

test("concurrent request cookies remain isolated across awaits and exceptions", async () => {
  const received: string[][] = [[], []];
  await Promise.all(
    received.map((values, index) =>
      withPendingRes(
        {
          setCookie: (name) => {
            values.push(name);
          },
          deleteCookie: () => {},
        },
        async () => {
          await setTimeout(index === 0 ? 15 : 1);
          getPendingRes()?.setCookie(String(index), "test", {});
        }
      )
    )
  );
  assert.deepEqual(received, [["0"], ["1"]]);
  assert.equal(getPendingRes(), undefined);
  assert.throws(() =>
    withPendingRes({ setCookie() {}, deleteCookie() {} }, () => {
      throw new Error("test");
    })
  );
  assert.equal(getPendingRes(), undefined);
});

test("portable bcrypt verifies an existing native hash and new hashes retain cost 12", async () => {
  // Generate with the previous native library and verify with the Worker library.
  const legacy = await nativeBcrypt.hash("password", 12);
  assert.equal(await verifyPassword("password", legacy), true);
  assert.equal(await verifyPassword("incorrect", legacy), false);
  const hash = await hashPassword("workers-compatibility-test");
  assert.match(hash, /^\$2[ab]\$12\$/);
  assert.equal(await verifyPassword("workers-compatibility-test", hash), true);
  assert.equal(await nativeBcrypt.compare("workers-compatibility-test", hash), true);
});

test("Prisma facade selects each request client without opening a database", async () => {
  // Constructors only: no connect/query and no local database or schema is created.
  const clients = [0, 1].map(
    () =>
      new PrismaClient({
        adapter: new PrismaPg({
          connectionString: "postgresql://unused:unused@127.0.0.1:1/unused",
        }),
      })
  );
  const scope = (client: PrismaClient): RuntimeContext => ({
    db: client,
    images: {
      metadata: async () => ({}),
      resize: async () => Buffer.alloc(0),
    },
    rateLimit: async () => 0,
  });
  await Promise.all(
    clients.map((client) =>
      runtimeContext.run(scope(client), async () => {
        await setTimeout(1);
        assert.equal(db.user, client.user);
        assert.equal(db.session, client.session);
      })
    )
  );
  await Promise.all(clients.map((client) => client.$disconnect()));
});

test("Node rate limiter enforces the existing window and isolates client IPs", async () => {
  const app = new Hono();
  app.use("*", createRateLimiter({ maxRequests: 2, windowMs: 900000, message: "limited" }));
  app.get("/login", (c) => c.text("ok"));
  const headers = { "x-forwarded-for": "192.0.2.1" };
  assert.equal((await app.request("/login", { headers })).status, 200);
  assert.equal((await app.request("/login", { headers })).status, 200);
  const limited = await app.request("/login", { headers });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("Retry-After")) > 0);
  assert.equal(
    (await app.request("/login", { headers: { "x-forwarded-for": "192.0.2.2" } })).status,
    200
  );
});
