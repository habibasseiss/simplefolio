"use server";

import type { ActionResult } from "@/actions/account.actions";
import {
  bondNameToTicker,
  createTesouroTransactionSchema,
  updateTesouroTransactionSchema,
} from "@/domain/tesouro/tesouro.schema";
import { getProvider } from "@/lib/providers";
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
  findTransactionById,
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
 * Derives the canonical `symbol` from the human-readable `bondName`
 * (e.g. "Tesouro Selic 2029" → "TESOURO_SELIC_2029") and delegates to the same
 * repository used by regular equity transactions. No prefix needed — the
 * `instrumentProvider = "TESOURO"` column identifies the source.
 */
export async function createTesouroTransactionAction(
  routeAccountId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const targetAccountId =
    (formData.get("accountId") as string) || routeAccountId;
  const parsed = createTesouroTransactionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getDefaultUserId();
  await assertAccountOwnership(targetAccountId, userId);

  const { bondName, ...rest } = parsed.data;
  const symbol = bondNameToTicker(bondName);

  await createTransaction(targetAccountId, {
    ...rest,
    symbol,
    purchaseRate: rest.purchaseRate ?? null,
    nraTax: null,
    reinvestDividends: false,
    isDrip: false,
  });

  await upsertSymbol({
    ticker: symbol,
    name: bondName,
    exchange: "Tesouro Direto",
    instrumentType: "BOND",
    instrumentProvider: "TESOURO",
  });

  revalidatePath(`/accounts/${targetAccountId}`);
  redirect(`/accounts/${targetAccountId}`);
}

/**
 * Updates an existing Tesouro Direto bond transaction.
 */
export async function updateTesouroTransactionAction(
  txId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getDefaultUserId();
  const existing = await findTransactionById(txId, userId);
  if (!existing) return { error: "Transaction not found" };
  const originalAccountId = existing.accountId;

  const targetAccountId =
    (formData.get("accountId") as string) || originalAccountId;
  const parsed = updateTesouroTransactionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await assertAccountOwnership(targetAccountId, userId);

  const { bondName, ...rest } = parsed.data;
  const symbol = bondName ? bondNameToTicker(bondName) : undefined;

  await updateTransaction(txId, originalAccountId, {
    ...rest,
    ...(symbol ? { symbol } : {}),
    accountId: targetAccountId,
  });

  if (symbol && bondName) {
    await upsertSymbol({
      ticker: symbol,
      name: bondName,
      exchange: "Tesouro Direto",
      instrumentType: "BOND",
      instrumentProvider: "TESOURO",
    });
  }

  revalidatePath(`/accounts/${targetAccountId}`);
  if (targetAccountId !== originalAccountId) {
    revalidatePath(`/accounts/${originalAccountId}`);
  }
  redirect(`/accounts/${targetAccountId}`);
}

/**
 * Deletes a Tesouro Direto bond transaction.
 */
export async function deleteTesouroTransactionAction(
  txId: string,
): Promise<ActionResult> {
  const userId = await getDefaultUserId();
  const existing = await findTransactionById(txId, userId);
  if (!existing) return { error: "Transaction not found" };
  const accountId = existing.accountId;

  await deleteTransaction(txId, accountId);

  revalidatePath(`/accounts/${accountId}`);
  redirect(`/accounts/${accountId}`);
}

/**
 * Syncs PU (Preço Unitário) price history for all Tesouro Direto bonds held
 * in the user's portfolio.
 *
 * Queries all TESOURO-provider symbols from the DB, determines the fromDate
 * for incremental sync, delegates fetching to TesouroProvider, and upserts
 * the resulting weekly candles.
 */
export async function syncTesouroPriceHistoryAction(): Promise<SyncTesouroResult> {
  const userId = await getDefaultUserId();
  const allSymbols = await findAllSymbols(userId);

  const bondSymbols = allSymbols.filter(
    (s) => s.instrumentProvider === "TESOURO",
  );

  if (bondSymbols.length === 0) {
    return { synced: 0, errors: [] };
  }

  const provider = getProvider("TESOURO");
  if (!provider) {
    return { synced: 0, errors: ["TESOURO provider not registered"] };
  }

  // Determine fromDate for each symbol: latest stored price date (incremental) or
  // earliest BUY transaction date (first-time sync)
  const { prisma } = await import("@/lib/prisma");
  const earliestDateRows = await prisma.transaction.groupBy({
    by: ["symbol"],
    where: {
      account: { userId },
      symbol: { in: bondSymbols.map((s) => s.symbol) },
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

  let synced = 0;
  const errors: string[] = [];

  for (const { symbol } of bondSymbols) {
    const latestDate = await findLatestPriceDate(symbol, "TESOURO");
    const fromDate =
      latestDate?.toISOString().split("T")[0] ?? earliestBuyMap.get(symbol);

    let candles;
    try {
      candles = await provider.syncPriceHistory(symbol, fromDate);
    } catch (err) {
      console.error(`[syncTesouro] Failed to fetch ${symbol}:`, err);
      errors.push(symbol);
      continue;
    }

    if (candles.length === 0) continue;

    try {
      const count = await upsertPriceHistory(symbol, "TESOURO", candles);
      synced += count;
    } catch (err) {
      console.error(`[syncTesouro] Failed to upsert ${symbol}:`, err);
      errors.push(symbol);
    }
  }

  return { synced, errors };
}
