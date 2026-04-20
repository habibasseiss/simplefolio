import { getFinanceProvider } from "@/lib/finance";
import { unstable_cache } from "next/cache";

export async function getExchangeRate(
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return 1;

  return unstable_cache(
    async () => {
      return getFinanceProvider().getExchangeRate(from, to);
    },
    ["fx-rate", from, to],
    { revalidate: 86400, tags: ["global-data-cache"] }, // 24 hours
  )();
}

/**
 * Fetches FX rates for all given currencies to `target` (default "USD").
 * All rates are cached for 24 hours.
 * Returns a Map from e.g. "EUR" → 1.08 (meaning 1 EUR = 1.08 USD).
 */
export async function getRatesTo(
  currencies: string[],
  target = "USD",
): Promise<Map<string, number>> {
  const unique = [...new Set(currencies)];
  const entries = await Promise.all(
    unique.map(async (c) => [c, await getExchangeRate(c, target)] as const),
  );
  return new Map(entries);
}
