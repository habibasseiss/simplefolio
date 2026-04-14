"use server";

import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/domain/transaction/transaction.schema";
import { getFinanceProvider } from "@/lib/finance";
import { findAccountById } from "@/repositories/account.repository";
import { upsertSymbol } from "@/repositories/symbol.repository";
import {
  createTransaction,
  deleteTransaction,
  findTransactionById,
  updateTransaction,
} from "@/repositories/transaction.repository";
import { getDefaultUserId } from "@/repositories/user.repository";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "./account.actions";

async function assertAccountOwnership(
  accountId: string,
  userId: string,
): Promise<void> {
  const account = await findAccountById(accountId, userId);
  if (!account) throw new Error("Account not found");
}

export async function createTransactionAction(
  routeAccountId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const targetAccountId = (formData.get("accountId") as string) ||
    routeAccountId;
  const applyNraTax = formData.get("applyNraTax") === "on";
  const nraTax = applyNraTax && process.env.NRA_TAX
    ? parseFloat(process.env.NRA_TAX)
    : null;
  const reinvestDividends = formData.get("reinvestDividends") === "on";

  const parsed = createTransactionSchema.safeParse({
    ...Object.fromEntries(formData),
    nraTax,
    reinvestDividends,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getDefaultUserId();
  await assertAccountOwnership(targetAccountId, userId);
  await createTransaction(targetAccountId, parsed.data);

  const { name, exchange } = await getFinanceProvider().getSymbolInfo(
    parsed.data.symbol,
  );
  await upsertSymbol(parsed.data.symbol, name, exchange);

  revalidatePath(`/accounts/${targetAccountId}`);
  redirect(`/accounts/${targetAccountId}`);
}

export async function updateTransactionAction(
  txId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await getDefaultUserId();
  const existing = await findTransactionById(txId, userId);
  if (!existing) return { error: "Transaction not found" };
  const originalAccountId = existing.accountId;

  const targetAccountId = (formData.get("accountId") as string) ||
    originalAccountId;
  const applyNraTax = formData.get("applyNraTax") === "on";
  const nraTax = applyNraTax && process.env.NRA_TAX
    ? parseFloat(process.env.NRA_TAX)
    : null;
  const reinvestDividends = formData.get("reinvestDividends") === "on";

  const parsed = updateTransactionSchema.safeParse({
    ...Object.fromEntries(formData),
    nraTax,
    reinvestDividends,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await assertAccountOwnership(targetAccountId, userId);
  await updateTransaction(txId, originalAccountId, {
    ...parsed.data,
    accountId: targetAccountId,
  });

  if (parsed.data.symbol) {
    const { name, exchange } = await getFinanceProvider().getSymbolInfo(
      parsed.data.symbol,
    );
    await upsertSymbol(parsed.data.symbol, name, exchange);
  }

  revalidatePath(`/accounts/${targetAccountId}`);
  if (targetAccountId !== originalAccountId) {
    revalidatePath(`/accounts/${originalAccountId}`);
  }
  redirect(`/accounts/${targetAccountId}`);
}

export async function deleteTransactionAction(
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
