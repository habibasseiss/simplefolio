import YahooFinance from "yahoo-finance2";
import type {
  Dividend,
  FinanceProvider,
  GlobalQuote,
  PriceCandle,
} from "../types";

export class YahooFinanceProvider implements FinanceProvider {
  private readonly yf: InstanceType<typeof YahooFinance>;

  constructor() {
    this.yf = new YahooFinance({
      suppressNotices: ["yahooSurvey"],
    });
  }

  async getGlobalQuote(symbol: string): Promise<GlobalQuote | null> {
    try {
      const quote = await this.yf.quote(symbol);

      if (!quote || !quote.regularMarketPrice) return null;

      return {
        symbol: quote.symbol,
        open: quote.regularMarketOpen ?? 0,
        high: quote.regularMarketDayHigh ?? 0,
        low: quote.regularMarketDayLow ?? 0,
        price: quote.regularMarketPrice,
        volume: quote.regularMarketVolume ?? 0,
        latestTradingDay: quote.regularMarketTime
          ? quote.regularMarketTime.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        previousClose: quote.regularMarketPreviousClose ?? 0,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
      };
    } catch (err) {
      console.error(`[YahooFinance] getGlobalQuote error for ${symbol}:`, err);
      return null;
    }
  }

  async getDividends(symbol: string): Promise<Dividend[]> {
    try {
      const data = await this.yf.chart(symbol, {
        period1: "2000-01-01",
        interval: "1mo",
        events: "div",
        return: "object",
      });

      const rawDividends = data.events?.dividends;
      if (!rawDividends) return [];

      return Object.values(rawDividends).map((d) => {
        const dateStr = d.date.toISOString().split("T")[0];
        return {
          exDividendDate: dateStr,
          declarationDate: "",
          recordDate: "",
          paymentDate: "",
          amount: d.amount,
        };
      });
    } catch (err) {
      console.error(`[YahooFinance] getDividends error for ${symbol}:`, err);
      return [];
    }
  }

  async getHistoricalPrices(
    symbol: string,
    fromDate: Date,
  ): Promise<PriceCandle[]> {
    try {
      const data = await this.yf.chart(symbol, {
        period1: fromDate,
        interval: "1wk",
        return: "array",
      });

      const currency = data.meta.currency ?? "USD";

      return data.quotes
        .filter((q) => q.adjclose != null)
        .map((q) => ({
          date: q.date.toISOString().split("T")[0],
          close: q.adjclose as number,
          currency,
        }));
    } catch (err) {
      console.error(
        `[YahooFinance] getHistoricalPrices error for ${symbol}:`,
        err,
      );
      return [];
    }
  }
}
