import type { FinanceProvider, GlobalQuote } from "../types";

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

export class AlphaVantageProvider implements FinanceProvider {
  private readonly baseUrl = "https://www.alphavantage.co/query";

  constructor(private readonly apiKey: string) {}

  async getGlobalQuote(symbol: string): Promise<GlobalQuote | null> {
    const url = new URL(this.baseUrl);
    url.searchParams.set("function", "GLOBAL_QUOTE");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", this.apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 300 } });

    if (!res.ok) return null;

    const data = (await res.json()) as AlphaVantageGlobalQuoteResponse;
    const quote = data["Global Quote"];

    if (!quote || !quote["05. price"]) return null;

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
}
