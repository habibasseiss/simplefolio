"use server";

import { getFinanceProvider } from "@/lib/finance";
import { getAllProviders } from "@/lib/providers";
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
 * Syncs price history for a single EQUITY symbol via Yahoo Finance.
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
  const latestStored = await findLatestPriceDate(symbol, "YAHOO");

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

  const count = await upsertPriceHistory(symbol, "YAHOO", candles);
  return { count };
}

/**
 * Syncs price history for every EQUITY symbol (Yahoo Finance).
 */
async function syncEquityPriceHistoryAction(): Promise<SyncPriceHistoryResult> {
  const userId = await getDefaultUserId();
  const allSymbols = await findAllSymbols(userId);
  const equitySymbols = allSymbols.filter(
    (s) => s.instrumentProvider === "YAHOO",
  );

  if (equitySymbols.length === 0) {
    return { synced: 0, errors: [] };
  }

  const { prisma } = await import("@/lib/prisma");
  const earliestBySymbol = await prisma.transaction.groupBy({
    by: ["symbol"],
    where: {
      account: { userId },
      type: { in: ["BUY", "SELL"] },
      instrumentProvider: "YAHOO",
    },
    _min: { date: true },
  });
  const startDateMap = new Map<string, Date>(
    earliestBySymbol.map((r) => [r.symbol, r._min.date!]),
  );

  let synced = 0;
  const errors: string[] = [];

  for (const { symbol } of equitySymbols) {
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

/**
 * Syncs price history for all registered bond providers.
 * Each registered DataProvider handles its own symbol set.
 */
async function syncBondPriceHistoryAction(): Promise<SyncPriceHistoryResult> {
  const userId = await getDefaultUserId();
  const allSymbols = await findAllSymbols(userId);

  const bondProviders = getAllProviders().filter(
    (p) => p.instrumentType === "BOND",
  );
  if (bondProviders.length === 0) return { synced: 0, errors: [] };

  let synced = 0;
  const errors: string[] = [];

  for (const provider of bondProviders) {
    const providerSymbols = allSymbols.filter(
      (s) => s.instrumentProvider === provider.id,
    );

    const { prisma } = await import("@/lib/prisma");
    const earliestDateRows = await prisma.transaction.groupBy({
      by: ["symbol"],
      where: {
        account: { userId },
        symbol: { in: providerSymbols.map((s) => s.symbol) },
        type: "BUY",
      },
      _min: { date: true },
    });
    const earliestBuyMap = new Map(
      earliestDateRows.map((r) => [
        r.symbol,
        r._min.date?.toISOString().split("T")[0] ?? undefined,
      ]),
    );

    for (const { symbol } of providerSymbols) {
      const latestDate = await findLatestPriceDate(symbol, provider.id);
      const fromDate =
        latestDate?.toISOString().split("T")[0] ?? earliestBuyMap.get(symbol);

      let candles;
      try {
        candles = await provider.syncPriceHistory(symbol, fromDate);
      } catch (err) {
        console.error(`[sync:${provider.id}] Failed to fetch ${symbol}:`, err);
        errors.push(symbol);
        continue;
      }

      if (candles.length === 0) continue;

      try {
        const count = await upsertPriceHistory(symbol, provider.id, candles);
        synced += count;
      } catch (err) {
        console.error(`[sync:${provider.id}] Failed to upsert ${symbol}:`, err);
        errors.push(symbol);
      }
    }
  }

  return { synced, errors };
}

/**
 * Syncs price history for every symbol in the user's portfolio,
 * including both equities (via Yahoo Finance) and all registered bond providers.
 */
export async function syncAllPriceHistoryAction(): Promise<SyncPriceHistoryResult> {
  const [equities, bonds] = await Promise.allSettled([
    syncEquityPriceHistoryAction(),
    syncBondPriceHistoryAction(),
  ]);

  const equitiesResult =
    equities.status === "fulfilled"
      ? equities.value
      : { synced: 0, errors: [] as string[] };
  const bondsResult =
    bonds.status === "fulfilled"
      ? bonds.value
      : { synced: 0, errors: [] as string[] };

  return {
    synced: equitiesResult.synced + bondsResult.synced,
    errors: [...equitiesResult.errors, ...bondsResult.errors],
  };
}
