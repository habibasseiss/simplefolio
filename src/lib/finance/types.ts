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

export interface FinanceProvider {
  getGlobalQuote(symbol: string): Promise<GlobalQuote | null>;
}
