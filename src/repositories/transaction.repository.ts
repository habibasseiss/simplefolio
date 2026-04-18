import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/domain/transaction/transaction.schema";
import type { Transaction } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type TransactionWithAccount = Transaction & {
  account: { id: string; name: string; currency: string };
};

export async function findTransactionsByAccountId(accountId: string) {
  return prisma.transaction.findMany({
    where: { accountId },
    orderBy: { date: "desc" },
  });
}

export async function findTransactionsBySymbol(
  userId: string,
  symbol: string,
): Promise<TransactionWithAccount[]> {
  return prisma.transaction.findMany({
    where: {
      symbol,
      account: { userId },
    },
    include: { account: { select: { id: true, name: true, currency: true } } },
    orderBy: { date: "desc" },
  }) as Promise<TransactionWithAccount[]>;
}

export async function findTransactionById(id: string, userId: string) {
  return prisma.transaction.findFirst({
    where: { id, account: { userId } },
    include: { account: { select: { id: true, name: true, currency: true } } },
  });
}

export async function createTransaction(
  accountId: string,
  data: CreateTransactionInput,
) {
  return prisma.transaction.create({
    data: { ...data, accountId },
  });
}

export async function updateTransaction(
  id: string,
  accountId: string,
  data: UpdateTransactionInput & { accountId?: string },
) {
  return prisma.transaction.update({
    where: { id, accountId },
    data,
  });
}

export async function deleteTransaction(id: string, accountId: string) {
  return prisma.transaction.delete({
    where: { id, accountId },
  });
}

export interface SymbolWithProvider {
  symbol: string;
  instrumentType: string;
  instrumentProvider: string;
}

export async function findAllSymbols(
  userId: string,
): Promise<SymbolWithProvider[]> {
  const rows = await prisma.transaction.findMany({
    where: { account: { userId }, type: { in: ["BUY", "SELL"] } },
    select: {
      symbol: true,
      instrumentType: true,
      instrumentProvider: true,
    },
    distinct: ["symbol"],
    orderBy: { symbol: "asc" },
  });
  return rows;
}

export async function findAllTransactionsForUser(
  userId: string,
): Promise<TransactionWithAccount[]> {
  return prisma.transaction.findMany({
    where: { account: { userId } },
    include: { account: { select: { id: true, name: true, currency: true } } },
    orderBy: { date: "desc" },
  }) as Promise<TransactionWithAccount[]>;
}
