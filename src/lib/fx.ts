import { getFinanceProvider } from "@/lib/finance";
import { unstable_cache } from "next/cache";

/**
 * Fetch a single FX rate, cached for 24 hours via Next.js data cache.
 * The cache key includes both currency codes so each pair is cached separately.
 */
const _fetchRate = unstable_cache(
  async (from: string, to: string): Promise<number> => {
    if (from === to) return 1;
    return getFinanceProvider().getExchangeRate(from, to);
  },
  ["fx-rate"],
  { revalidate: 86400 }, // 24 hours
);

export async function getExchangeRate(
  from: string,
  to: string,
): Promise<number> {
  return _fetchRate(from, to);
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
