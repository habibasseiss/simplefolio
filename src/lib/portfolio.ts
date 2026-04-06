/**
 * Pure computation helpers for building weekly portfolio-value chart series.
 * No I/O — just math over transactions and price history rows.
 */

import type { PriceHistoryRow } from "@/repositories/price-history.repository";

/** Minimal transaction shape needed by the portfolio computations. */
export type PortfolioTx = {
  symbol: string;
  type: string;
  date: Date | string;
  quantity: number;
  unitPrice: number;
  fee: number;
};

export interface ChartPoint {
  /** ISO date string YYYY-MM-DD (week start) */
  date: string;
  /** Portfolio market value at this week */
  value: number;
  /** Cost basis at this week */
  cost: number;
}

/**
 * Computes the running share count for a single symbol from a sorted-ascending
 * list of BUY/SELL transactions up to (and including) `upToDate`.
 */
function sharesAt(
  txs: PortfolioTx[],
  symbol: string,
  upToDate: Date,
): number {
  return txs
    .filter(
      (tx) =>
        tx.symbol === symbol &&
        (tx.type === "BUY" || tx.type === "SELL") &&
        new Date(tx.date) <= upToDate,
    )
    .reduce((acc, tx) => {
      if (tx.type === "BUY") return acc + tx.quantity;
      if (tx.type === "SELL") return acc - tx.quantity;
      return acc;
    }, 0);
}

/**
 * Computes the running cost basis for a single symbol up to `upToDate`.
 * BUY adds (qty * unitPrice + fee), SELL subtracts proportionally.
 */
function costAt(
  txs: PortfolioTx[],
  symbol: string,
  upToDate: Date,
): number {
  let totalShares = 0;
  let totalCost = 0;

  for (const tx of txs) {
    if (
      tx.symbol !== symbol ||
      (tx.type !== "BUY" && tx.type !== "SELL") ||
      new Date(tx.date) > upToDate
    ) {
      continue;
    }
    if (tx.type === "BUY") {
      totalCost += tx.quantity * tx.unitPrice + tx.fee;
      totalShares += tx.quantity;
    } else {
      // Proportional cost reduction on sell
      const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
      totalCost -= tx.quantity * avgCost;
      totalShares -= tx.quantity;
    }
  }

  return totalCost;
}

/**
 * Builds a weekly chart series for a single symbol.
 *
 * @param transactions - All BUY/SELL transactions for this symbol (any order).
 * @param priceHistory - Weekly candles for this symbol, sorted ascending.
 */
export function computeSymbolChart(
  transactions: PortfolioTx[],
  priceHistory: PriceHistoryRow[],
): ChartPoint[] {
  const symbolTxs = transactions.filter(
    (tx) => tx.type === "BUY" || tx.type === "SELL",
  );
  if (symbolTxs.length === 0 || priceHistory.length === 0) return [];

  const symbol = priceHistory[0].symbol;

  return priceHistory.map((row) => {
    const weekEnd = new Date(row.date);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const shares = sharesAt(symbolTxs, symbol, weekEnd);
    const cost = costAt(symbolTxs, symbol, weekEnd);

    return {
      date: row.date.toISOString().split("T")[0],
      value: shares * row.close,
      cost,
    };
  });
}

/**
 * Builds a weekly chart series for an account.
 * All symbols in the account are summed (in their native currencies — no FX conversion).
 *
 * @param transactions - All BUY/SELL transactions belonging to this account.
 * @param priceHistoryMap - Map of symbol → sorted-ascending candles.
 */
export function computeAccountChart(
  transactions: PortfolioTx[],
  priceHistoryMap: Map<string, PriceHistoryRow[]>,
): ChartPoint[] {
  return computePortfolioChart(transactions, priceHistoryMap);
}

/**
 * Builds a weekly chart series for the overall portfolio.
 * All symbols across all accounts are summed.
 *
 * @param transactions - All BUY/SELL transactions for the user.
 * @param priceHistoryMap - Map of symbol → sorted-ascending candles.
 */
export function computeOverallChart(
  transactions: PortfolioTx[],
  priceHistoryMap: Map<string, PriceHistoryRow[]>,
): ChartPoint[] {
  return computePortfolioChart(transactions, priceHistoryMap);
}

/**
 * Shared implementation: sums value/cost over all symbols for a given
 * transaction set + price history map. Uses the union of all available weeks.
 */
function computePortfolioChart(
  transactions: PortfolioTx[],
  priceHistoryMap: Map<string, PriceHistoryRow[]>,
): ChartPoint[] {
  const symbols = [...priceHistoryMap.keys()];
  if (symbols.length === 0) return [];

  // Collect all unique week dates across all symbols
  const weekSet = new Set<string>();
  for (const rows of priceHistoryMap.values()) {
    for (const row of rows) {
      weekSet.add(row.date.toISOString().split("T")[0]);
    }
  }

  const weeks = [...weekSet].sort();

  return weeks.map((week) => {
    const weekDate = new Date(week + "T00:00:00Z");
    const weekEnd = new Date(weekDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let totalValue = 0;
    let totalCost = 0;

    for (const symbol of symbols) {
      const rows = priceHistoryMap.get(symbol)!;
      // Use the most recent price available at or before this week
      const row = [...rows].reverse().find((r) => r.date <= weekEnd);
      if (!row) continue;

      const symbolTxs = transactions.filter((tx) => tx.symbol === symbol);
      const shares = sharesAt(symbolTxs, symbol, weekEnd);
      const cost = costAt(symbolTxs, symbol, weekEnd);

      totalValue += shares * row.close;
      totalCost += cost;
    }

    return { date: week, value: totalValue, cost: totalCost };
  });
}
