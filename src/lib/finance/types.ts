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

export interface FinanceProvider {
  getGlobalQuote(symbol: string): Promise<GlobalQuote | null>;
  getDividends(symbol: string): Promise<Dividend[]>;
}
