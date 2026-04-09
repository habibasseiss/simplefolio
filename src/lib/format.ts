/**
 * Maps a currency code to its natural BCP-47 locale for number formatting.
 * Add new entries here whenever a new currency is added to CURRENCIES in .env.
 */
const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US",
  BRL: "pt-BR",
  EUR: "de-DE",
  GBP: "en-GB",
  CAD: "en-CA",
  AUD: "en-AU",
  JPY: "ja-JP",
  CHF: "de-CH",
}

export function getCurrencyLocale(currency: string): string {
  return CURRENCY_LOCALE[currency] ?? "en-US"
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

