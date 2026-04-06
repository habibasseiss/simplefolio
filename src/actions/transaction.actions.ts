"use server";

import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/domain/transaction/transaction.schema";
import { findAccountById } from "@/repositories/account.repository";
import { upsertSymbol } from "@/repositories/symbol.repository";
import {
  createTransaction,
  deleteTransaction,
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
  accountId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const applyNraTax = formData.get("applyNraTax") === "on";
  const nraTax = applyNraTax && process.env.NRA_TAX
    ? parseFloat(process.env.NRA_TAX)
    : null;

  const parsed = createTransactionSchema.safeParse({
    ...Object.fromEntries(formData),
    nraTax,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getDefaultUserId();
  await assertAccountOwnership(accountId, userId);
  await createTransaction(accountId, parsed.data);

  const symbolName = (formData.get("symbolName") as string | null)?.trim() ||
    null;
  if (symbolName) {
    await upsertSymbol(parsed.data.symbol, symbolName, null);
  }

  revalidatePath(`/accounts/${accountId}`);
  redirect(`/accounts/${accountId}`);
}

export async function updateTransactionAction(
  accountId: string,
  txId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const applyNraTax = formData.get("applyNraTax") === "on";
  const nraTax = applyNraTax && process.env.NRA_TAX
    ? parseFloat(process.env.NRA_TAX)
    : null;

  const parsed = updateTransactionSchema.safeParse({
    ...Object.fromEntries(formData),
    nraTax,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getDefaultUserId();
  await assertAccountOwnership(accountId, userId);
  await updateTransaction(txId, accountId, parsed.data);

  const symbolName = (formData.get("symbolName") as string | null)?.trim() ||
    null;
  if (symbolName && parsed.data.symbol) {
    await upsertSymbol(parsed.data.symbol, symbolName, null);
  }

  revalidatePath(`/accounts/${accountId}`);
  redirect(`/accounts/${accountId}`);
}

export async function deleteTransactionAction(
  accountId: string,
  txId: string,
): Promise<ActionResult> {
  const userId = await getDefaultUserId();
  await assertAccountOwnership(accountId, userId);
  await deleteTransaction(txId, accountId);

  revalidatePath(`/accounts/${accountId}`);
  redirect(`/accounts/${accountId}`);
}
