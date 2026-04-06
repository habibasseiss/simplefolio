import type { PriceCandle } from "@/lib/finance";
import { prisma } from "@/lib/prisma";

export type PriceHistoryRow = {
  symbol: string;
  date: Date;
  close: number;
  currency: string;
};

/** Returns all stored weekly candles for a symbol, ordered by date ascending. */
export async function findPriceHistory(
  symbol: string,
): Promise<PriceHistoryRow[]> {
  return prisma.priceHistory.findMany({
    where: { symbol },
    orderBy: { date: "asc" },
    select: { symbol: true, date: true, close: true, currency: true },
  });
}

/** Returns the most recent stored date for a symbol, or null if none. */
export async function findLatestPriceDate(
  symbol: string,
): Promise<Date | null> {
  const row = await prisma.priceHistory.findFirst({
    where: { symbol },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return row?.date ?? null;
}

/** Upserts a batch of weekly candles, overwriting the close price if the row exists. */
export async function upsertPriceHistory(
  symbol: string,
  candles: PriceCandle[],
): Promise<number> {
  if (candles.length === 0) return 0;

  // SQLite has no native upsert batching via createMany with skipDuplicates for
  // update semantics — use individual upserts which Prisma compiles to INSERT OR REPLACE.
  await Promise.all(
    candles.map((c) =>
      prisma.priceHistory.upsert({
        where: {
          symbol_date: { symbol, date: new Date(c.date + "T00:00:00Z") },
        },
        create: {
          symbol,
          date: new Date(c.date + "T00:00:00Z"),
          close: c.close,
          currency: c.currency,
        },
        update: { close: c.close, currency: c.currency },
      })
    ),
  );

  return candles.length;
}
