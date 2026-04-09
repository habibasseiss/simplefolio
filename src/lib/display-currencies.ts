/**
 * Currencies available for display, driven by the CURRENCIES env var.
 * First value is the default (no URL param needed).
 */
export const DISPLAY_CURRENCIES = (process.env.CURRENCIES ?? "USD")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);

/**
 * Resolves the active display currency from a raw URL param,
 * falling back to the first configured currency.
 */
export function resolveDisplayCurrency(
  rawCurrency: string | undefined,
): string {
  const defaultCurrency = DISPLAY_CURRENCIES[0] ?? "USD";
  return rawCurrency && DISPLAY_CURRENCIES.includes(rawCurrency)
    ? rawCurrency
    : defaultCurrency;
}
