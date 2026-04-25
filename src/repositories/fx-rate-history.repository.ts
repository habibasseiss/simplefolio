import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FxRateHistoryRow {
  date: Date;
  currency: string;
  source: string;
  buyRate: number;
  sellRate: number;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns the stored PTAX closing rate for a given date + currency + source,
 * or null if not yet fetched.
 */
export async function findFxRate(
  date: Date,
  currency: string,
  source = "PTAX",
): Promise<FxRateHistoryRow | null> {
  return prisma.fxRateHistory.findUnique({
    where: {
      date_currency_source: { date, currency, source },
    },
    select: { date: true, currency: true, source: true, buyRate: true, sellRate: true },
  });
}

/**
 * Returns all stored FX rates for a given set of dates, currency, and source.
 * Efficient single-query alternative to multiple findFxRate calls.
 */
export async function findFxRatesByDates(
  dates: Date[],
  currency: string,
  source = "PTAX",
): Promise<Map<string, FxRateHistoryRow>> {
  if (dates.length === 0) return new Map();

  const rows = await prisma.fxRateHistory.findMany({
    where: { date: { in: dates }, currency, source },
    select: { date: true, currency: true, source: true, buyRate: true, sellRate: true },
  });

  const map = new Map<string, FxRateHistoryRow>();
  for (const row of rows) {
    map.set(row.date.toISOString().slice(0, 10), row);
  }
  return map;
}

/**
 * Given a list of calendar dates, returns the subset that have no stored FX
 * rate for `currency` + `source`. Used to minimise BCB API calls.
 */
export async function findMissingFxDates(
  dates: Date[],
  currency: string,
  source = "PTAX",
): Promise<Date[]> {
  if (dates.length === 0) return [];

  const existing = await prisma.fxRateHistory.findMany({
    where: { date: { in: dates }, currency, source },
    select: { date: true },
  });

  const existingSet = new Set(
    existing.map((r) => r.date.toISOString().slice(0, 10)),
  );

  return dates.filter((d) => !existingSet.has(d.toISOString().slice(0, 10)));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Upserts a single FX rate entry. Safe to call multiple times for the same
 * (date, currency, source) — always overwrites with latest rates.
 */
export async function upsertFxRate(
  date: Date,
  currency: string,
  source: string,
  buyRate: number,
  sellRate: number,
): Promise<void> {
  await prisma.fxRateHistory.upsert({
    where: { date_currency_source: { date, currency, source } },
    create: { date, currency, source, buyRate, sellRate },
    update: { buyRate, sellRate },
  });
}

/**
 * Upserts a batch of FX rates for the same currency + source.
 * Returns the number of rows written.
 */
export async function upsertFxRates(
  entries: Array<{ date: Date; currency: string; source: string; buyRate: number; sellRate: number }>,
): Promise<number> {
  if (entries.length === 0) return 0;

  await Promise.all(
    entries.map((e) =>
      prisma.fxRateHistory.upsert({
        where: {
          date_currency_source: {
            date: e.date,
            currency: e.currency,
            source: e.source,
          },
        },
        create: e,
        update: { buyRate: e.buyRate, sellRate: e.sellRate },
      }),
    ),
  );

  return entries.length;
}
