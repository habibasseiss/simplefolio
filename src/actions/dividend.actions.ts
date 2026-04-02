"use server";

import { getFinanceProvider } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/repositories/user.repository";

export interface ImportDividendsResult {
  inserted: number;
  skipped: number;
  error?: string;
}

export async function importDividendsAction(
  symbol: string,
): Promise<ImportDividendsResult> {
  const userId = await getDefaultUserId();

  let dividends;
  try {
    dividends = await getFinanceProvider().getDividends(symbol);
  } catch {
    return { inserted: 0, skipped: 0, error: "Failed to fetch dividends" };
  }

  if (dividends.length === 0) {
    return {
      inserted: 0,
      skipped: 0,
      error: "No dividend data found for " + symbol,
    };
  }

  // Find all accounts belonging to the user that have any transaction for this symbol
  const accounts = await prisma.account.findMany({
    where: { userId, transactions: { some: { symbol } } },
    include: {
      transactions: {
        where: { symbol },
        orderBy: { date: "asc" },
      },
    },
  });

  if (accounts.length === 0) {
    return { inserted: 0, skipped: 0, error: "No accounts hold " + symbol };
  }

  let inserted = 0;
  let skipped = 0;

  const nraTaxRate = process.env.NRA_TAX
    ? parseFloat(process.env.NRA_TAX)
    : null;

  for (const account of accounts) {
    for (const dividend of dividends) {
      if (!dividend.exDividendDate || dividend.amount <= 0) {
        skipped++;
        continue;
      }

      const exDate = new Date(dividend.exDividendDate);

      // Calculate shares held at ex-dividend date (end of that day)
      const exDateEndOfDay = new Date(exDate);
      exDateEndOfDay.setHours(23, 59, 59, 999);

      const sharesAtExDate = account.transactions
        .filter((tx) => new Date(tx.date) <= exDateEndOfDay)
        .reduce((acc, tx) => {
          if (tx.type === "BUY") return acc + tx.quantity;
          if (tx.type === "SELL") return acc - tx.quantity;
          return acc;
        }, 0);

      if (sharesAtExDate <= 0) {
        skipped++;
        continue;
      }

      // Use payment_date as the transaction date (when dividends are actually received)
      const txDate = dividend.paymentDate
        ? new Date(dividend.paymentDate)
        : exDate;

      // Upsert: update quantity/price if dividend already exists (new buys may have changed shares held)
      const existing = await prisma.transaction.findFirst({
        where: {
          accountId: account.id,
          type: "DIVIDEND",
          symbol,
          date: txDate,
        },
      });

      if (existing) {
        await prisma.transaction.update({
          where: { id: existing.id },
          data: {
            quantity: sharesAtExDate,
            unitPrice: dividend.amount,
            nraTax: nraTaxRate,
            notes:
              `Auto-imported dividend. Ex-date: ${dividend.exDividendDate}`,
          },
        });
        skipped++;
        continue;
      }

      await prisma.transaction.create({
        data: {
          accountId: account.id,
          type: "DIVIDEND",
          symbol,
          date: txDate,
          quantity: sharesAtExDate,
          unitPrice: dividend.amount,
          nraTax: nraTaxRate,
          fee: 0,
          notes: `Auto-imported dividend. Ex-date: ${dividend.exDividendDate}`,
        },
      });

      inserted++;
    }
  }

  return { inserted, skipped };
}
