import type { Game } from "@prisma/client";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { AsyncLocalStorage } from "node:async_hooks";
import { db } from "../db/client";
import { normalizeLanguage } from "../i18n";
import { getCookieValue, resolveUserId, SESSION_COOKIE_NAME } from "../utils/session";

/**
 * Hono 注入的 Response 对象引用
 * 用于 auth 等模块需要设置 cookie 的场景
 */
type PendingResponse = {
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void;
  deleteCookie: (name: string, options: Record<string, unknown>) => void;
};
const responseContext = new AsyncLocalStorage<PendingResponse>();
// Cookie callbacks belong to a single Hono request, including during concurrent awaits.
export function withPendingRes<T>(res: PendingResponse, callback: () => T): T {
  return responseContext.run(res, callback);
}

export function getPendingRes() {
  return responseContext.getStore();
}

export const createContext = async ({ req }: FetchCreateContextFnOptions) => {
  const cookieHeader = req.headers.get("cookie") ?? undefined;
  const userId = await resolveUserId(cookieHeader);
  const sessionId = getCookieValue(cookieHeader, SESSION_COOKIE_NAME);

  const gameKey = req.headers.get("x-game-id");
  const languageHeader = req.headers.get("x-lang") ?? req.headers.get("accept-language");
  const language = normalizeLanguage(
    typeof languageHeader === "string" ? languageHeader : undefined
  );

  // 获取客户端 IP（支持反向代理）
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "unknown";

  return {
    db,
    userId,
    sessionId,
    gameKey: typeof gameKey === "string" ? gameKey : undefined,
    game: undefined as Game | undefined,
    language,
    ip,
    res: getPendingRes(),
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * requireUser / requireGame 中间件执行后的上下文类型。
 * 这些中间件会在 userId 为 undefined 时抛出 UNAUTHORIZED，
 * 因此在受保护的 handler 中 userId 一定是 string。
 */
export type AuthenticatedContext = Omit<Context, "userId"> & { userId: string };
