import type { PriceCandle } from "@/lib/finance";
import { prisma } from "@/lib/prisma";

export type PriceHistoryRow = {
  symbol: string;
  instrumentProvider: string;
  date: Date;
  close: number;
  currency: string;
};

/**
 * Returns all stored weekly candles for a given symbol + provider, ordered ascending.
 */
export async function findPriceHistory(
  symbol: string,
  instrumentProvider: string,
): Promise<PriceHistoryRow[]> {
  return prisma.priceHistory.findMany({
    where: { symbol, instrumentProvider },
    orderBy: { date: "asc" },
    select: {
      symbol: true,
      instrumentProvider: true,
      date: true,
      close: true,
      currency: true,
    },
  });
}

/**
 * Returns the most recent stored date for a symbol + provider pair, or null if none.
 */
export async function findLatestPriceDate(
  symbol: string,
  instrumentProvider: string,
): Promise<Date | null> {
  const row = await prisma.priceHistory.findFirst({
    where: { symbol, instrumentProvider },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return row?.date ?? null;
}

/**
 * Upserts a batch of weekly candles for a given symbol + provider.
 * Overwrites the close price if the row already exists.
 */
export async function upsertPriceHistory(
  symbol: string,
  instrumentProvider: string,
  candles: PriceCandle[],
): Promise<number> {
  if (candles.length === 0) return 0;

  await Promise.all(
    candles.map((c) =>
      prisma.priceHistory.upsert({
        where: {
          symbol_instrumentProvider_date: {
            symbol,
            instrumentProvider,
            date: new Date(c.date + "T00:00:00Z"),
          },
        },
        create: {
          symbol,
          instrumentProvider,
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
