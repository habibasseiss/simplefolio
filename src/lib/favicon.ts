/**
 * Favicon service — fetches a brand icon for a given website URL.
 *
 * Tries three providers in order and returns the first URL whose image
 * actually loads (HTTP 2xx + Content-Type image/*).  Returns `null` when
 * all providers fail.
 */

const PROVIDERS = [
  (domain: string) =>
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  (domain: string) => `https://icon.horse/icon/${domain}`,
  (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
];

/**
 * Strips the protocol and trailing slash from a URL so we get a bare domain
 * that works as a query parameter for every provider.
 *
 * e.g. "https://www.chase.com/" → "www.chase.com"
 */
function extractDomain(website: string): string {
  try {
    return new URL(website).hostname;
  } catch {
    // Already a bare domain or invalid — use as-is.
    return website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

/**
 * Returns `true` when `url` resolves to an image response.
 */
async function isImageReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") ?? "";
    return ct.startsWith("image/");
  } catch {
    return false;
  }
}

/**
 * Given a bank / broker website URL, returns the first favicon URL that
 * responds successfully, or `null` if none of the providers work.
 *
 * Providers tried in order:
 *  1. Google S2 Favicons (128 px)
 *  2. icon.horse
 *  3. DuckDuckGo icons
 */
export async function fetchFaviconUrl(website: string): Promise<string | null> {
  const domain = extractDomain(website);

  for (const buildUrl of PROVIDERS) {
    const url = buildUrl(domain);
    if (await isImageReachable(url)) {
      return url;
    }
  }

  return null;
}

/**
 * Returns the favicon URL for a given website without network validation —
 * useful for client-side <img> rendering where the browser handles the
 * fallback gracefully.  Falls back through providers via `onError`.
 *
 * Returns an ordered list of URLs to try so the component can implement
 * its own fallback chain.
 */
export function getFaviconUrls(website: string): string[] {
  const domain = extractDomain(website);
  return PROVIDERS.map((buildUrl) => buildUrl(domain));
}
