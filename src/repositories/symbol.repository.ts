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

export async function findSymbol(ticker: string) {
  return prisma.symbol.findUnique({ where: { ticker } });
}

export async function findSymbolsByTickers(tickers: string[]) {
  if (tickers.length === 0) return [];
  return prisma.symbol.findMany({ where: { ticker: { in: tickers } } });
}
