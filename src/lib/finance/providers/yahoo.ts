import YahooFinance from "yahoo-finance2";
import type {
  Dividend,
  FinanceProvider,
  GlobalQuote,
  PriceCandle,
  SymbolSearchResult,
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

  async getDividends(symbol: string, fromDate?: Date): Promise<Dividend[]> {
    try {
      const data = await this.yf.chart(symbol, {
        period1: fromDate ?? "2000-01-01",
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

  async getSymbolInfo(
    ticker: string,
  ): Promise<{ name: string | null; exchange: string | null }> {
    try {
      const quote = await this.yf.quote(ticker);
      return {
        name: quote.longName ?? quote.shortName ?? null,
        exchange: quote.fullExchangeName ?? null,
      };
    } catch (err) {
      console.error(`[YahooFinance] getSymbolInfo error for ${ticker}:`, err);
      return { name: null, exchange: null };
    }
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    try {
      const quote = await this.yf.quote(`${from}${to}=X`);
      return quote.regularMarketPrice ?? 1;
    } catch (err) {
      console.error(`[YahooFinance] getExchangeRate ${from}→${to}:`, err);
      return 1; // fallback: treat as same currency
    }
  }

  async searchSymbols(query: string): Promise<SymbolSearchResult[]> {
    try {
      const data = await this.yf.search(query);

      return data.quotes
        .filter(
          (q) =>
            "symbol" in q &&
            q.symbol &&
            q.quoteType !== "MUTUALFUND" &&
            q.quoteType !== "FUTURE",
        )
        .slice(0, 10)
        .map((q) => {
          const typed = q as {
            symbol: string;
            shortname?: string;
            longname?: string;
            exchDisp?: string;
          };
          return {
            ticker: typed.symbol,
            name: typed.longname ?? typed.shortname ?? null,
            exchange: typed.exchDisp ?? null,
          };
        });
    } catch (err) {
      console.error(`[YahooFinance] searchSymbols error for ${query}:`, err);
      return [];
    }
  }
}
