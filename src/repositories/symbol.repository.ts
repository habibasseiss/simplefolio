import { prisma } from "@/lib/prisma";

export async function upsertSymbol(
  ticker: string,
  name: string | null,
  exchange: string | null,
) {
  await prisma.symbol.upsert({
    where: { ticker },
    create: { ticker, name, exchange },
    update: { name, exchange },
  });
}

/**
 * Creates a Symbol row if one doesn't exist yet.
 * Never overwrites an existing name/exchange — safe to call from batch import
 * where we only know the ticker.
 */
export async function ensureSymbol(ticker: string) {
  await prisma.symbol.upsert({
    where: { ticker },
    create: { ticker, name: null, exchange: null },
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
