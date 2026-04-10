"use server";

import type { ActionResult } from "@/actions/account.actions";
import {
  createTesouroTransactionSchema,
  updateTesouroTransactionSchema,
} from "@/domain/tesouro/tesouro.schema";
import {
  bondTicker,
  bondTickerToName,
  isTesouroBond,
} from "@/domain/tesouro/tesouro.utils";
import { fetchTesouroBonds } from "@/lib/tesouro";
import { findAccountById } from "@/repositories/account.repository";
import {
  findLatestPriceDate,
  upsertPriceHistory,
} from "@/repositories/price-history.repository";
import { upsertSymbol } from "@/repositories/symbol.repository";
import {
  createTransaction,
  deleteTransaction,
  findAllSymbols,
  updateTransaction,
} from "@/repositories/transaction.repository";
import { getDefaultUserId } from "@/repositories/user.repository";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface SyncTesouroResult {
  synced: number;
  errors: string[];
}

async function assertAccountOwnership(
  accountId: string,
  userId: string,
): Promise<void> {
  const account = await findAccountById(accountId, userId);
  if (!account) throw new Error("Account not found");
}

/**
 * Creates a new Tesouro Direto bond transaction.
 *
 * Derives the canonical `symbol` from the human-readable `bondTitle` (e.g.
 * "Tesouro Selic 2029" → "TD:TESOURO_SELIC_2029") and delegates to the same
 * repository used by regular stock transactions.
 */
export async function createTesouroTransactionAction(
  accountId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createTesouroTransactionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getDefaultUserId();
  await assertAccountOwnership(accountId, userId);

  const { bondTitle, ...rest } = parsed.data;
  const symbol = bondTicker(bondTitle);

  await createTransaction(accountId, {
    ...rest,
    symbol,
    // Defaults not applicable to bonds
    purchaseRate: rest.purchaseRate ?? null,
    nraTax: null,
    reinvestDividends: false,
    isDrip: false,
  });

  // Persist a Symbol entry so the symbol page and existing queries work
  await upsertSymbol(symbol, bondTitle, "Tesouro Direto");

  // Eagerly sync PU price history so the symbol page shows data immediately
  // await syncTesouroPriceHistoryAction();

  revalidatePath(`/accounts/${accountId}`);
  redirect(`/accounts/${accountId}`);
}

/**
 * Updates an existing Tesouro Direto bond transaction.
 */
export async function updateTesouroTransactionAction(
  accountId: string,
  txId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateTesouroTransactionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getDefaultUserId();
  await assertAccountOwnership(accountId, userId);

  const { bondTitle, ...rest } = parsed.data;
  const symbol = bondTitle ? bondTicker(bondTitle) : undefined;

  await updateTransaction(txId, accountId, {
    ...rest,
    ...(symbol ? { symbol } : {}),
  });

  if (symbol && bondTitle) {
    await upsertSymbol(symbol, bondTitle, "Tesouro Direto");
  }

  revalidatePath(`/accounts/${accountId}`);
  redirect(`/accounts/${accountId}`);
}

/**
 * Deletes a Tesouro Direto bond transaction (same as regular transactions).
 */
export async function deleteTesouroTransactionAction(
  accountId: string,
  txId: string,
): Promise<ActionResult> {
  const userId = await getDefaultUserId();
  await assertAccountOwnership(accountId, userId);
  await deleteTransaction(txId, accountId);

  revalidatePath(`/accounts/${accountId}`);
  redirect(`/accounts/${accountId}`);
}

/**
 * Syncs PU (Preço Unitário) price history for all Tesouro Direto bonds held
 * in the user's portfolio.
 *
 * For each `TD:*` symbol, fetches the full quote history from the Tesouro API
 * and upserts the data into the shared `PriceHistory` table using the compra
 * (purchase) PU as the `close` price. This allows the existing portfolio chart
 * computations to transparently include bond positions.
 *
 * Returns the same `SyncTesouroResult` shape as `SyncPriceHistoryResult` for
 * consistency.
 */
export async function syncTesouroPriceHistoryAction(): Promise<
  SyncTesouroResult
> {
  const userId = await getDefaultUserId();
  const allSymbols = await findAllSymbols(userId);

  // Also include TD bonds that have only SELL transactions (not in findAllSymbols
  // which filters BUY/SELL but excludes non-stock types — we need to re-query)
  const { prisma } = await import("@/lib/prisma");
  const bondSymbolRows = await prisma.transaction.findMany({
    where: {
      account: { userId },
      symbol: { startsWith: "TD:" },
    },
    select: { symbol: true },
    distinct: ["symbol"],
  });

  const bondSymbols = [
    ...new Set([
      ...allSymbols.filter(isTesouroBond),
      ...bondSymbolRows.map((r) => r.symbol),
    ]),
  ];

  if (bondSymbols.length === 0) {
    return { synced: 0, errors: [] };
  }

  // For each bond, determine the fromDate:
  // - Use the latest stored PriceHistory date if available (incremental sync)
  // - Fall back to the earliest BUY transaction date for a first-time sync
  const earliestDateRows = await prisma.transaction.groupBy({
    by: ["symbol"],
    where: {
      account: { userId },
      symbol: { in: bondSymbols },
      type: "BUY",
    },
    _min: { date: true },
  });
  const earliestBuyMap = new Map(
    earliestDateRows.map((r) => [
      r.symbol,
      r._min.date?.toISOString().split("T")[0] ?? undefined,
    ]),
  );

  const latestPriceDates = await Promise.all(
    bondSymbols.map(async (symbol) => {
      const date = await findLatestPriceDate(symbol);
      return [symbol, date?.toISOString().split("T")[0] ?? undefined] as const;
    }),
  );
  const fromDateMap = new Map<string, string | undefined>([
    ...earliestBuyMap,
    ...latestPriceDates.filter(([, d]) => d !== undefined),
  ]);

  let synced = 0;
  const errors: string[] = [];

  for (const symbol of bondSymbols) {
    const bondName = bondTickerToName(symbol);
    const fromDate = fromDateMap.get(symbol);

    // Paginate through all available historical quotes for this bond
    let allBonds: Awaited<ReturnType<typeof fetchTesouroBonds>>["data"] = [];
    const pageSize = 500;
    let page = 1;
    let totalPages = 1;

    try {
      do {
        const response = await fetchTesouroBonds({
          title: bondName,
          type: "compra",
          limit: pageSize,
          page,
          history: true,
          fromDate,
        });
        allBonds = allBonds.concat(response.data);
        totalPages = response.meta.totalPages;
        page++;
      } while (page <= totalPages);
    } catch (err) {
      console.error(`[syncTesouro] Failed to fetch ${symbol}:`, err);
      errors.push(symbol);
      continue;
    }

    if (allBonds.length === 0) continue;

    // Downsample daily PU data to weekly candles (Monday of each ISO week).
    // For each calendar week, pick the first available trading day and use
    // its date snapped to the Monday of that week — matching the format
    // used by Yahoo Finance weekly candles stored for stocks.
    const weekMap = new Map<string, number>();
    for (const b of allBonds) {
      if (b.puCompra <= 0) continue;
      const d = new Date(b.baseDate + "T00:00:00Z");
      // Snap to Monday: subtract (dayOfWeek - 1) days, treating 0=Sunday as 6
      const dow = d.getUTCDay(); // 0=Sun … 6=Sat
      const daysToMonday = dow === 0 ? 6 : dow - 1;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - daysToMonday);
      const key = monday.toISOString().split("T")[0];
      // Keep the first entry for the week (earliest trading day)
      if (!weekMap.has(key)) weekMap.set(key, b.puCompra);
    }

    const candles = Array.from(weekMap.entries()).map(([date, close]) => ({
      date,
      close,
      currency: "BRL",
    }));

    if (candles.length === 0) continue;

    try {
      const count = await upsertPriceHistory(symbol, candles);
      synced += count;
    } catch (err) {
      console.error(`[syncTesouro] Failed to upsert ${symbol}:`, err);
      errors.push(symbol);
    }
  }

  return { synced, errors };
}
