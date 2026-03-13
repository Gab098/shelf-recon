import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __db: PrismaClient | undefined;
}

function missingEnvProxy(message: string): PrismaClient {
  const err = new Error(message);
  // PrismaClient is a class, but we only need a shape-compatible object at runtime until env is set.
  // Any access will throw a clear error instead of crashing the server at import time.
  return new Proxy(
    {},
    {
      get() {
        throw err;
      },
    },
  ) as unknown as PrismaClient;
}

export const db =
  global.__db ??
  (process.env.DATABASE_URL
    ? new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      })
    : missingEnvProxy(
        "[Shelf Recon] DATABASE_URL missing. Set it in your deployment environment (Vercel/Railway) before running the app.",
      ));

if (process.env.NODE_ENV !== "production") global.__db = db;
