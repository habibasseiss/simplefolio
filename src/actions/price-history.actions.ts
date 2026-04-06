"use server";

import { getFinanceProvider } from "@/lib/finance";
import {
  findLatestPriceDate,
  upsertPriceHistory,
} from "@/repositories/price-history.repository";
import { findAllSymbols } from "@/repositories/transaction.repository";
import { getDefaultUserId } from "@/repositories/user.repository";

export interface SyncPriceHistoryResult {
  synced: number;
  /** Symbols that failed to fetch */
  errors: string[];
}

/**
 * Syncs price history for a single symbol.
 * Only fetches weeks that are not yet stored (incremental).
 *
 * @param symbol - Ticker symbol to sync.
 * @param firstTransactionDate - Earliest transaction date for this symbol.
 *        Used as the starting point if no history is stored yet.
 */
export async function syncSymbolPriceHistoryAction(
  symbol: string,
  firstTransactionDate: Date,
): Promise<{ count: number; error?: string }> {
  const latestStored = await findLatestPriceDate(symbol);

  // Start from the week before the latest stored date (to catch the current
  // incomplete week being overwritten), or from the first transaction date.
  let fromDate: Date;
  if (latestStored) {
    fromDate = new Date(latestStored);
    fromDate.setDate(fromDate.getDate() - 7); // re-fetch the last week too
  } else {
    fromDate = new Date(firstTransactionDate);
  }

  let candles;
  try {
    candles = await getFinanceProvider().getHistoricalPrices(symbol, fromDate);
  } catch {
    return { count: 0, error: `Failed to fetch price history for ${symbol}` };
  }

  if (candles.length === 0) {
    return { count: 0 };
  }

  const count = await upsertPriceHistory(symbol, candles);
  return { count };
}

/**
 * Syncs price history for every symbol in the user's portfolio.
 * Incremental — only fetches missing weeks per symbol.
 */
export async function syncAllPriceHistoryAction(): Promise<
  SyncPriceHistoryResult
> {
  const userId = await getDefaultUserId();
  const symbols = await findAllSymbols(userId);

  if (symbols.length === 0) {
    return { synced: 0, errors: [] };
  }

  // Fetch earliest transaction dates per symbol to use as fallback start date
  const { prisma } = await import("@/lib/prisma");
  const earliestBySymbol = await prisma.transaction.groupBy({
    by: ["symbol"],
    where: { account: { userId }, type: { in: ["BUY", "SELL"] } },
    _min: { date: true },
  });
  const startDateMap = new Map<string, Date>(
    earliestBySymbol.map((r) => [r.symbol, r._min.date!]),
  );

  let synced = 0;
  const errors: string[] = [];

  // Fetch sequentially to avoid hammering Yahoo
  for (const symbol of symbols) {
    const fromDate = startDateMap.get(symbol) ?? new Date("2000-01-01");
    const result = await syncSymbolPriceHistoryAction(symbol, fromDate);
    if (result.error) {
      errors.push(symbol);
    } else {
      synced += result.count;
    }
  }

  return { synced, errors };
}
