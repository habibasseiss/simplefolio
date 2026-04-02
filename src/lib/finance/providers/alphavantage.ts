import type { Dividend, FinanceProvider, GlobalQuote } from "../types";

interface AlphaVantageGlobalQuoteResponse {
  "Global Quote": {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
  };
}

interface AlphaVantageDividendsResponse {
  data: Array<{
    ex_dividend_date: string;
    declaration_date: string;
    record_date: string;
    payment_date: string;
    amount: string;
  }>;
}

export class AlphaVantageProvider implements FinanceProvider {
  private readonly baseUrl = "https://www.alphavantage.co/query";

  constructor(private readonly apiKey: string) {}

  async getGlobalQuote(symbol: string): Promise<GlobalQuote | null> {
    const url = new URL(this.baseUrl);
    url.searchParams.set("function", "GLOBAL_QUOTE");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", this.apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });

    if (!res.ok) {
      console.error(
        `[AlphaVantage] getGlobalQuote HTTP ${res.status} for ${symbol}`,
      );
      return null;
    }

    const data = (await res.json()) as AlphaVantageGlobalQuoteResponse & {
      Note?: string;
      Information?: string;
      "Error Message"?: string;
    };

    if (data.Note || data.Information || data["Error Message"]) {
      console.error(
        `[AlphaVantage] getGlobalQuote error for ${symbol}:`,
        data.Note ?? data.Information ?? data["Error Message"],
      );
      return null;
    }

    console.log(
      `[AlphaVantage] getGlobalQuote response for ${symbol}:`,
      JSON.stringify(data, null, 2),
    );

    const quote = data["Global Quote"];

    if (!quote || !quote["05. price"]) {
      console.error(
        `[AlphaVantage] getGlobalQuote: missing quote data for ${symbol}. Full response:`,
        JSON.stringify(data, null, 2),
      );
      return null;
    }

    return {
      symbol: quote["01. symbol"],
      open: parseFloat(quote["02. open"]),
      high: parseFloat(quote["03. high"]),
      low: parseFloat(quote["04. low"]),
      price: parseFloat(quote["05. price"]),
      volume: parseInt(quote["06. volume"], 10),
      latestTradingDay: quote["07. latest trading day"],
      previousClose: parseFloat(quote["08. previous close"]),
      change: parseFloat(quote["09. change"]),
      changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
    };
  }
  async getDividends(symbol: string): Promise<Dividend[]> {
    const url = new URL(this.baseUrl);
    url.searchParams.set("function", "DIVIDENDS");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", this.apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data = (await res.json()) as AlphaVantageDividendsResponse;
    if (!Array.isArray(data?.data)) return [];

    return data.data.map((d) => ({
      exDividendDate: d.ex_dividend_date,
      declarationDate: d.declaration_date,
      recordDate: d.record_date,
      paymentDate: d.payment_date,
      amount: parseFloat(d.amount),
    }));
  }
}
