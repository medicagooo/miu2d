import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "../env";
import { runtimeContext } from "../runtime/context";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getClient(): PrismaClient {
  const scoped = runtimeContext.getStore()?.db;
  if (scoped) return scoped;
  return (globalForPrisma.prisma ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.databaseUrl }),
  }));
}

// Resolve at call time: never retain a Worker's client in a module singleton.
export const db = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const client = getClient();
    const value = Reflect.get(client, key);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type DbClient = typeof db;
