"use server";

import { buildFxSnapshot } from "@/domain/transaction/fx-snapshots.types";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getPtaxRate, getPtaxRatePeriod, type PtaxRate } from "@/lib/ptax";
import {
  findFxRatesByDates,
  findMissingFxDates,
  upsertFxRate,
  upsertFxRates,
} from "@/repositories/fx-rate-history.repository";
import { getDefaultUserId } from "@/repositories/user.repository";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Normalise a Date to midnight UTC (strips time component). */
function toMidnightUtc(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

/**
 * Finds the date-range extremes of an array of dates.
 * Used to build minimal period requests to the BCB API.
 */
function dateRange(dates: Date[]): { min: Date; max: Date } {
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  return { min: sorted[0], max: sorted[sorted.length - 1] };
}

/** How many calendar days to look back when a date has no BCB rate (weekend / holiday). */
const PTAX_LOOKBACK_DAYS = 7;

/**
 * Calls getPtaxRate for the given date, then walks backwards up to
 * PTAX_LOOKBACK_DAYS until a rate is found. Returns null only when no
 * trading day exists within the lookback window.
 */
async function getPtaxRateWithFallback(
  currency: string,
  date: Date,
): Promise<PtaxRate | null> {
  for (let i = 0; i <= PTAX_LOOKBACK_DAYS; i++) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() - i);
    const rate = await getPtaxRate(currency, d);
    if (rate) return rate;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Exposed server actions
// ---------------------------------------------------------------------------

export interface SyncPtaxResult {
  synced: number;
  skipped: number;
  errors: string[];
}

/**
 * Syncs official PTAX closing rates for all non-BRL account currencies and
 * all BUY transaction dates for the current user.
 *
 * Only fetches dates that are not already stored in FxRateHistory — safe to
 * call multiple times, will only download what is missing.
 */
export async function syncPtaxRatesAction(): Promise<SyncPtaxResult> {
  const userId = await getDefaultUserId();

  // 1. Gather all (date, currency) pairs we need from existing transactions
  const rows = await prisma.transaction.findMany({
    where: {
      type: { in: ["BUY", "SELL", "DIVIDEND", "TAX"] },
      account: { userId },
    },
    select: {
      date: true,
      account: { select: { currency: true } },
    },
  });

  // Group dates per currency (skip BRL — no conversion needed)
  const datesByCurrency = new Map<string, Set<string>>();
  for (const row of rows) {
    const currency = row.account.currency;
    if (currency === "BRL") continue;

    if (!datesByCurrency.has(currency)) {
      datesByCurrency.set(currency, new Set());
    }
    datesByCurrency
      .get(currency)!
      .add(toMidnightUtc(row.date).toISOString());
  }

  if (datesByCurrency.size === 0) {
    return { synced: 0, skipped: 0, errors: [] };
  }

  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [currency, isoSet] of datesByCurrency) {
    const allDates = [...isoSet].map((s) => new Date(s));

    // 2. Find which dates are missing from FxRateHistory
    const missingDates = await findMissingFxDates(allDates, currency);
    skipped += allDates.length - missingDates.length;

    if (missingDates.length === 0) continue;

    try {
      // 3. Fetch from BCB using the period endpoint (one HTTP call per currency).
      //    Extend the start by PTAX_LOOKBACK_DAYS so that the first date in the
      //    window can still walk back to the previous trading day inside the map.
      const { min, max } = dateRange(missingDates);
      const extendedMin = new Date(min);
      extendedMin.setUTCDate(extendedMin.getUTCDate() - PTAX_LOOKBACK_DAYS);
      const rateMap = await getPtaxRatePeriod(currency, extendedMin, max);

      // 4. Build upsert entries. For weekends / holidays, walk back inside the
      //    already-fetched map instead of making additional API calls.
      const entries: Parameters<typeof upsertFxRates>[0] = [];
      for (const d of missingDates) {
        const isoKey = d.toISOString().slice(0, 10);
        let rate = rateMap.get(isoKey);
        if (!rate) {
          for (let i = 1; i <= PTAX_LOOKBACK_DAYS; i++) {
            const prev = new Date(d);
            prev.setUTCDate(prev.getUTCDate() - i);
            rate = rateMap.get(prev.toISOString().slice(0, 10));
            if (rate) break;
          }
        }
        if (rate) {
          entries.push({
            date: d,
            currency,
            source: "PTAX",
            buyRate: rate.buy,
            sellRate: rate.sell,
          });
        }
      }

      const written = await upsertFxRates(entries);
      synced += written;
      // Dates with no BCB rate even after lookback (very old data?) count as skipped
      skipped += missingDates.length - entries.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${currency}: ${msg}`);
    }
  }

  return { synced, skipped, errors };
}

export interface BackfillResult {
  updated: number;
  skipped: number;
}

/**
 * Backfills fxSnapshots on all existing transactions that have null snapshots.
 * Requires FxRateHistory to have been populated first (run syncPtaxRatesAction).
 *
 * Transactions in BRL accounts are skipped (no FX conversion needed).
 * Transactions on weekends/holidays will remain null (no BCB rate available).
 */
export async function backfillPtaxSnapshotsAction(): Promise<BackfillResult> {
  const userId = await getDefaultUserId();

  const transactions = await prisma.transaction.findMany({
    where: {
      fxSnapshots: { equals: Prisma.DbNull },
      account: { userId },
    },
    select: {
      id: true,
      date: true,
      account: { select: { currency: true } },
    },
  });

  if (transactions.length === 0) {
    return { updated: 0, skipped: 0 };
  }

  // Group by currency for efficient batch lookups
  const byCurrency = new Map<
    string,
    Array<{ id: string; date: Date }>
  >();
  let skipped = 0;
  for (const tx of transactions) {
    const currency = tx.account.currency;
    if (currency === "BRL") {
      skipped++;
      continue;
    }
    if (!byCurrency.has(currency)) byCurrency.set(currency, []);
    byCurrency.get(currency)!.push({ id: tx.id, date: toMidnightUtc(tx.date) });
  }

  let updated = 0;

  for (const [currency, txList] of byCurrency) {
    const dates = txList.map((t) => t.date);
    const rateMap = await findFxRatesByDates(dates, currency);

    for (const tx of txList) {
      const isoKey = tx.date.toISOString().slice(0, 10);
      // Exact match first; fall back to most recent rate ≤ date (holiday / weekend)
      const rate = rateMap.get(isoKey) ??
        (await prisma.fxRateHistory.findFirst({
          where: { currency, source: "PTAX", date: { lte: tx.date } },
          orderBy: { date: "desc" },
          select: {
            buyRate: true,
            sellRate: true,
            date: true,
            currency: true,
            source: true,
          },
        })) ??
        null;
      if (!rate) {
        skipped++;
        continue;
      }

      const snapshot = buildFxSnapshot(
        currency,
        "BRL",
        "PTAX",
        rate.buyRate,
        rate.sellRate,
      );
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { fxSnapshots: snapshot as unknown as Prisma.InputJsonValue },
      });
      updated++;
    }
  }

  return { updated, skipped };
}

// ---------------------------------------------------------------------------
// Internal helper used by transaction.actions.ts
// ---------------------------------------------------------------------------

/**
 * Fetches and caches the PTAX closing rate for a given currency + date, then
 * returns an fxSnapshots blob ready to be stored on a Transaction.
 *
 * Returns null when:
 *  - currency is BRL (no cross rate needed)
 *  - the date is a weekend or Brazilian holiday (BCB returns nothing)
 *  - the BCB API call fails
 */
export async function buildPtaxSnapshotForTransaction(
  currency: string,
  date: Date,
): Promise<Record<string, unknown> | null> {
  if (currency === "BRL") return null;

  const normalized = toMidnightUtc(date);

  try {
    const rate = await getPtaxRateWithFallback(currency, normalized);
    if (!rate) return null;

    // Cache in FxRateHistory
    await upsertFxRate(normalized, currency, "PTAX", rate.buy, rate.sell);

    return buildFxSnapshot(currency, "BRL", "PTAX", rate.buy, rate.sell);
  } catch {
    // Never let a PTAX failure break a transaction save
    return null;
  }
}
