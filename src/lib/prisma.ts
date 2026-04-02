import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
// Strip "file:" prefix — better-sqlite3 expects a plain path or ":memory:"
const dbUrl = DATABASE_URL.startsWith("file:")
  ? DATABASE_URL.slice("file:".length)
  : DATABASE_URL;

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({ adapter });
}

// Singleton pattern — prevent multiple instances in development (HMR)
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
