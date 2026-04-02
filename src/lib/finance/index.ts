import { AlphaVantageProvider } from "./providers/alphavantage";
import type { FinanceProvider } from "./types";

export type { FinanceProvider, GlobalQuote } from "./types";

let provider: FinanceProvider | null = null;

export function getFinanceProvider(): FinanceProvider {
  if (!provider) {
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error("ALPHAVANTAGE_API_KEY environment variable is not set");
    }
    provider = new AlphaVantageProvider(apiKey);
  }
  return provider;
}
