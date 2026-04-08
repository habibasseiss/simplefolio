export interface GlobalQuote {
  symbol: string;
  open: number;
  high: number;
  low: number;
  price: number;
  volume: number;
  latestTradingDay: string;
  previousClose: number;
  change: number;
  changePercent: number;
}

export interface Dividend {
  exDividendDate: string;
  declarationDate: string;
  recordDate: string;
  paymentDate: string;
  amount: number;
}

export interface PriceCandle {
  /** ISO date string (YYYY-MM-DD), represents the week start (Monday) */
  date: string;
  /** Split-adjusted close price */
  close: number;
  currency: string;
}

export interface SymbolSearchResult {
  ticker: string;
  name: string | null;
  exchange: string | null;
}

export interface FinanceProvider {
  getGlobalQuote(symbol: string): Promise<GlobalQuote | null>;
  getDividends(symbol: string): Promise<Dividend[]>;
  /**
   * Fetch weekly adjusted-close prices from `fromDate` to today.
   * The caller is responsible for passing the date of the latest stored row
   * so only missing weeks are fetched.
   */
  getHistoricalPrices(symbol: string, fromDate: Date): Promise<PriceCandle[]>;
  /** Search for instruments by keyword. Returns up to 10 results. */
  searchSymbols(query: string): Promise<SymbolSearchResult[]>;
  /**
   * Returns the exchange rate to convert 1 unit of `from` into `to`.
   * E.g. getExchangeRate("EUR", "USD") ≈ 1.08
   */
  getExchangeRate(from: string, to: string): Promise<number>;
  /** Returns the human-readable name and exchange for a given ticker. */
  getSymbolInfo(
    ticker: string,
  ): Promise<{ name: string | null; exchange: string | null }>;
}
