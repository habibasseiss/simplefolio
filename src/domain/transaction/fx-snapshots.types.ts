/**
 * Generic FX snapshot types.
 *
 * An `FxSnapshots` blob is stored on a transaction to capture the official
 * exchange rate(s) at the time of trade. The outer key is a currency pair in
 * the form "FOREIGN/DOMESTIC" (e.g. "USD/BRL", "EUR/BRL").
 *
 * Example:
 *   {
 *     "USD/BRL": { "source": "PTAX", "buy": 5.12, "sell": 5.13 }
 *   }
 *
 * Keeping this as a JSON blob (rather than dedicated columns) means:
 *   - Multiple pairs per transaction are trivially supported
 *   - New sources (ECB, custom) add zero schema changes
 *   - Brazil-specific semantics (PTAX, Receita Federal) stay out of the schema
 */

export interface FxSnapshotEntry {
  /** Rate source identifier, e.g. "PTAX", "ECB". */
  source: string;
  /** Buy rate: 1 unit of foreign currency costs this many units of domestic currency. */
  buy: number;
  /** Sell rate: 1 unit of foreign currency fetches this many units of domestic currency. */
  sell: number;
}

/**
 * Map of currency-pair key → FX rate entry.
 * Key format: "FOREIGN/DOMESTIC", e.g. "USD/BRL".
 */
export type FxSnapshots = Record<string, FxSnapshotEntry>;

/** Helper: build a standard FxSnapshots blob for a single pair. */
export function buildFxSnapshot(
  foreignCurrency: string,
  domesticCurrency: string,
  source: string,
  buy: number,
  sell: number,
): FxSnapshots {
  const key = `${foreignCurrency}/${domesticCurrency}`;
  return { [key]: { source, buy, sell } };
}
