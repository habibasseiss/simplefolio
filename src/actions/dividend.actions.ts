"use server";

import { getFinanceProvider } from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import { findAllSymbols } from "@/repositories/transaction.repository";
import { getDefaultUserId } from "@/repositories/user.repository";

export interface ImportDividendsResult {
  inserted: number;
  skipped: number;
  error?: string;
}

export async function importDividendsAction(
  symbol: string,
  overwrite = false,
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

      if (existing && !overwrite) {
        skipped++;
        continue;
      }

      if (existing) {
        // overwrite = true: update the existing dividend
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
        // fall-through to handle DRIP update below
      } else {
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
            notes:
              `Auto-imported dividend. Ex-date: ${dividend.exDividendDate}`,
          },
        });
        inserted++;
      }

      // DRIP: calculate shares from BUY transactions that have reinvestDividends enabled
      // (the user-opted positions), plus any existing DRIP BUYs (isDrip=true) for compounding.
      const dripSharesAtExDate = account.transactions
        .filter((tx) => new Date(tx.date) <= exDateEndOfDay)
        .reduce((acc, tx) => {
          if (tx.type === "BUY" && (tx.reinvestDividends || tx.isDrip)) {
            return acc + tx.quantity;
          }
          return acc;
        }, 0);

      if (dripSharesAtExDate > 0) {
        const priceRecord = await prisma.priceHistory.findFirst({
          where: {
            symbol,
            date: { lte: new Date(exDate.getTime() + 8 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { date: "desc" },
        });
        const price = priceRecord?.close;
        if (price && price > 0) {
          const totalDividend = dripSharesAtExDate * dividend.amount *
            (1 - (nraTaxRate ?? 0));
          const dripQuantity = totalDividend / price;
          const existingDrip = await prisma.transaction.findFirst({
            where: {
              accountId: account.id,
              type: "BUY",
              isDrip: true,
              symbol,
              date: txDate,
            },
          });
          if (existingDrip) {
            if (overwrite) {
              await prisma.transaction.update({
                where: { id: existingDrip.id },
                data: {
                  quantity: dripQuantity,
                  unitPrice: price,
                  nraTax: nraTaxRate,
                  notes: `DRIP auto-buy. Ex-date: ${dividend.exDividendDate}`,
                },
              });
            }
          } else {
            await prisma.transaction.create({
              data: {
                accountId: account.id,
                type: "BUY",
                isDrip: true,
                symbol,
                date: txDate,
                quantity: dripQuantity,
                unitPrice: price,
                fee: 0,
                nraTax: nraTaxRate,
                notes: `DRIP auto-buy. Ex-date: ${dividend.exDividendDate}`,
              },
            });
          }
        }
      }
    }
  }

  return { inserted, skipped };
}

export interface ImportAllDividendsResult {
  inserted: number;
  skipped: number;
  errors: { symbol: string; error: string }[];
}

export async function importAllDividendsAction(
  overwrite = false,
): Promise<ImportAllDividendsResult> {
  const userId = await getDefaultUserId();
  const symbols = await findAllSymbols(userId);

  let inserted = 0;
  let skipped = 0;
  const errors: { symbol: string; error: string }[] = [];

  for (const symbol of symbols) {
    const result = await importDividendsAction(symbol, overwrite);
    if (result.error) {
      errors.push({ symbol, error: result.error });
    } else {
      inserted += result.inserted;
      skipped += result.skipped;
    }
  }

  return { inserted, skipped, errors };
}
