import { AlphaVantageProvider } from "./providers/alphavantage";
import { YahooFinanceProvider } from "./providers/yahoo";
import type { FinanceProvider } from "./types";

export type { Dividend, FinanceProvider, GlobalQuote } from "./types";

let provider: FinanceProvider | null = null;

export function getFinanceProvider(): FinanceProvider {
  if (!provider) {
    const providerName = process.env.FINANCE_PROVIDER ?? "yahoo";

    if (providerName === "alphavantage") {
      const apiKey = process.env.ALPHAVANTAGE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "ALPHAVANTAGE_API_KEY environment variable is not set",
        );
      }
      provider = new AlphaVantageProvider(apiKey);
    } else {
      provider = new YahooFinanceProvider();
    }
  }
  return provider;
}
