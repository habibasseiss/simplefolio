import type {
  CreateAccountInput,
  UpdateAccountInput,
} from "@/domain/account/account.schema";
import { prisma } from "@/lib/prisma";

export async function findAccountsByUserId(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    include: { _count: { select: { transactions: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function findAccountById(id: string, userId: string) {
  return prisma.account.findFirst({
    where: { id, userId },
  });
}

export async function findAccountByName(name: string, userId: string) {
  const accounts = await prisma.account.findMany({ where: { userId } });
  const lower = name.toLowerCase();
  return accounts.find((a) => a.name.toLowerCase() === lower) ?? null;
}

export async function createAccount(userId: string, data: CreateAccountInput) {
  return prisma.account.create({
    data: { ...data, userId },
  });
}

export async function updateAccount(
  id: string,
  userId: string,
  data: UpdateAccountInput,
) {
  return prisma.account.update({
    where: { id, userId },
    data,
  });
}

export async function deleteAccount(id: string, userId: string) {
  return prisma.account.delete({
    where: { id, userId },
  });
}
