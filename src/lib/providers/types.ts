import type { PriceCandle } from "@/lib/finance";

/**
 * Identifier string for a data provider.
 * Must match the `instrumentProvider` values stored in the database.
 * e.g. "YAHOO", "TESOURO"
 */
export type ProviderId = string;

/**
 * A DataProvider is responsible for fetching and transforming market data
 * for a specific set of instruments into standardized PriceCandle records.
 *
 * Providers must be free of database dependencies — they only fetch + transform.
 * The action layer is responsible for persisting the results.
 */
export interface DataProvider {
  /** Must match the `instrumentProvider` column value, e.g. "YAHOO" | "TESOURO" */
  readonly id: ProviderId;
  /** Human-readable label, e.g. "Yahoo Finance", "Tesouro Direto" */
  readonly label: string;
  /** The instrument class this provider handles, e.g. "EQUITY" | "BOND" */
  readonly instrumentType: string;

  /**
   * Fetch weekly PriceCandles for the given ticker from `fromDate` to today.
   * @param ticker           The bare symbol as stored in the DB, e.g. "AAPL" or "TESOURO_SELIC_2029"
   * @param fromDate         ISO date string (YYYY-MM-DD) — only return data on or after this date.
   * @returns                Array of weekly candles, sorted ascending by date.
   */
  syncPriceHistory(ticker: string, fromDate?: string): Promise<PriceCandle[]>;
}
