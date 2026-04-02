import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
const dbUrl = DATABASE_URL.startsWith("file:")
  ? DATABASE_URL.slice(5)
  : DATABASE_URL;

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  await prisma.user.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: "Default User",
    },
  });

  console.log("✓ Default user seeded");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
