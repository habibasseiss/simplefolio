import { YahooFinanceProvider } from "./providers/yahoo";
import type { FinanceProvider } from "./types";

export type {
  Dividend,
  FinanceProvider,
  GlobalQuote,
  PriceCandle,
} from "./types";

let provider: FinanceProvider | null = null;

export function getFinanceProvider(): FinanceProvider {
  if (!provider) {
    provider = new YahooFinanceProvider();
  }

  return provider;
}
