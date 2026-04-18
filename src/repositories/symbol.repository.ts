import { prisma } from "@/lib/prisma";

export interface UpsertSymbolOptions {
  ticker: string;
  name: string | null;
  exchange: string | null;
  instrumentType?: string;
  instrumentProvider?: string;
}

export async function upsertSymbol({
  ticker,
  name,
  exchange,
  instrumentType = "EQUITY",
  instrumentProvider = "YAHOO",
}: UpsertSymbolOptions) {
  await prisma.symbol.upsert({
    where: { ticker },
    create: { ticker, name, exchange, instrumentType, instrumentProvider },
    update: { name, exchange, instrumentType, instrumentProvider },
  });
}

/**
 * Creates a Symbol row if one doesn't exist yet.
 * Never overwrites an existing name/exchange — safe to call from batch import
 * where we only know the ticker.
 */
export async function ensureSymbol(
  ticker: string,
  instrumentType = "EQUITY",
  instrumentProvider = "YAHOO",
) {
  await prisma.symbol.upsert({
    where: { ticker },
    create: {
      ticker,
      name: null,
      exchange: null,
      instrumentType,
      instrumentProvider,
    },
    update: {}, // keep existing name/exchange intact
  });
}

export async function findSymbol(ticker: string) {
  return prisma.symbol.findUnique({ where: { ticker } });
}

export async function findSymbolsByTickers(tickers: string[]) {
  if (tickers.length === 0) return [];
  return prisma.symbol.findMany({ where: { ticker: { in: tickers } } });
}
