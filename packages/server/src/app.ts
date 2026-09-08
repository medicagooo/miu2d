import "reflect-metadata";

import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

// Import all module routers to register them (side-effect imports)
import "./modules";

import { env } from "./env";
import { dataRoutes } from "./routes/data.routes";
import { fileRoutes } from "./routes/file.routes";
import { gameConfigRoutes } from "./routes/gameConfig.routes";
import { levelRoutes } from "./routes/level.routes";
import { sceneRoutes } from "./routes/scene.routes";
import { createContext, withPendingRes } from "./trpc/context";
import { appRouter } from "./trpc/router";
import { createRateLimiter } from "./utils/rate-limiter";
import { db } from "./db/client";
import { checkStorageConnection } from "./storage/s3";

export const app = new Hono();

// CORS
const ALLOWED_ORIGINS = env.corsOrigins
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : ""),
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));
// Readiness is independent from liveness and never exposes connection details.
app.get("/health/ready", async (c) => {
  c.header("Cache-Control", "no-store");
  const results = await Promise.allSettled([db.$queryRaw`SELECT 1`, checkStorageConnection()]);
  const database = results[0].status === "fulfilled";
  const storage = results[1].status === "fulfilled";
  return c.json(
    { status: database && storage ? "ok" : "unavailable", database, storage },
    database && storage ? 200 : 503
  );
});

// 两个入口可能经不同反代到达后端，API 的禁缓存策略在源服务统一生效。
app.use("/game/:gameSlug/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "private, no-store");
});

// REST routes
app.route("/game", fileRoutes);
app.route("/game", gameConfigRoutes);
app.route("/game", dataRoutes);
app.route("/game", sceneRoutes);
app.route("/game", levelRoutes);

// Rate limiting for auth endpoints (must be registered before the tRPC handler)
// Login: 10 attempts per IP per 15 minutes
app.use(
  "/trpc/auth.login",
  createRateLimiter({
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
    message: "Too many login attempts, please try again in 15 minutes.",
  })
);
// Register: 5 attempts per IP per hour
app.use(
  "/trpc/auth.register",
  createRateLimiter({
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    message: "Too many registration attempts, please try again in 1 hour.",
  })
);

// tRPC
app.use("/trpc/*", async (c, next) => {
  // 注入一个用于设置/删除 Cookie 的辅助对象
  // auth 模块需要它来设置 session cookie
  const pendingCookies: string[] = [];
  const pendingResponse = {
    setCookie: (name: string, value: string, options: Record<string, unknown>) => {
      const parts = [`${name}=${encodeURIComponent(value)}`];
      if (options.path) parts.push(`Path=${options.path}`);
      if (options.maxAge) parts.push(`Max-Age=${Math.floor((options.maxAge as number) / 1000)}`);
      if (options.httpOnly) parts.push("HttpOnly");
      if (options.secure) parts.push("Secure");
      if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
      if (options.partitioned) parts.push("Partitioned");
      pendingCookies.push(parts.join("; "));
    },
    deleteCookie: (name: string, options: Record<string, unknown>) => {
      const parts = [`${name}=`, "Max-Age=0"];
      if (options.path) parts.push(`Path=${options.path}`);
      if (options.httpOnly) parts.push("HttpOnly");
      if (options.secure) parts.push("Secure");
      if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
      if (options.partitioned) parts.push("Partitioned");
      pendingCookies.push(parts.join("; "));
    },
  };

  await withPendingRes(pendingResponse, next);

  c.header("Cache-Control", "private, no-store");

  // 将 tRPC handler 中产生的 Set-Cookie 添加到响应中
  for (const cookie of pendingCookies) {
    c.header("Set-Cookie", cookie, { append: true });
  }
});

app.use("/trpc/*", trpcServer({ router: appRouter, createContext }));
