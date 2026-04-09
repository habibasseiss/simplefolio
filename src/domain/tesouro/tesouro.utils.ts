/**
 * Domain utilities for Tesouro Direto bond identifiers.
 *
 * TD bonds are stored in the `Transaction.symbol` column using a canonical
 * ticker format that:
 *  1. Is prefixed with "TD:" to avoid collisions with stock tickers.
 *  2. Is uppercased with spaces replaced by underscores.
 *
 * Examples:
 *   "Tesouro Selic 2029"           → "TD:TESOURO_SELIC_2029"
 *   "Tesouro IPCA+ 2045"           → "TD:TESOURO_IPCA+_2045"
 *   "Tesouro Prefixado 2031"       → "TD:TESOURO_PREFIXADO_2031"
 */

const TD_PREFIX = "TD:";

/**
 * Converts a human-readable Tesouro Direto bond name to a canonical ticker.
 * Used when storing a transaction.
 *
 * @example bondTicker("Tesouro Selic 2029") // → "TD:TESOURO_SELIC_2029"
 */
export function bondTicker(bondName: string): string {
  return TD_PREFIX + bondName.trim().toUpperCase().replace(/\s+/g, "_");
}

/**
 * Converts a canonical ticker back to the human-readable bond name.
 * Used when displaying a transaction or calling the Tesouro API.
 *
 * @example bondTickerToName("TD:TESOURO_SELIC_2029") // → "Tesouro Selic 2029"
 */
export function bondTickerToName(ticker: string): string {
  if (!ticker.startsWith(TD_PREFIX)) return ticker;
  const slug = ticker.slice(TD_PREFIX.length);
  // Replace underscores with spaces and apply title case
  return slug
    .replace(/_/g, " ")
    .replace(/\w+/g, (word) => word.charAt(0) + word.slice(1).toLowerCase());
}

/**
 * Returns true if the given ticker belongs to a Tesouro Direto bond.
 *
 * @example isTesouroBond("TD:TESOURO_SELIC_2029") // → true
 * @example isTesouroBond("VT")                    // → false
 */
export function isTesouroBond(ticker: string): boolean {
  return ticker.startsWith(TD_PREFIX);
}
