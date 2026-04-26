"use server";

import type { FxSnapshots } from "@/domain/transaction/fx-snapshots.types";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/repositories/user.repository";

export interface AssetSummary {
  symbol: string;
  quantity: number;
  totalCostBrl: number;
  avgCostBrl: number;
  prevYearTotalCostBrl: number;
  variationBrl: number;
}

export interface CapitalGainEvent {
  date: Date;
  symbol: string;
  quantity: number;
  saleValueBrl: number;
  costBrl: number;
  gainLossBrl: number;
  tax15Brl: number;
}

export interface DividendEvent {
  symbol: string;
  grossUsd: number;
  grossBrl: number;
  taxWithheldUsd: number;
  taxWithheldBrl: number;
}

export interface PtaxEvent {
  date: Date;
  type: "BUY" | "SELL" | "DIVIDEND";
  usdValue: number;
  ptaxRate: number;
  brlValue: number;
}

export interface ReportsData {
  assets: AssetSummary[];
  capitalGains: CapitalGainEvent[];
  dividends: DividendEvent[];
  ptaxHistory: PtaxEvent[];
}

/**
 * Per Lei 14.754/2023 and IN RFB 2.180/2024:
 *   - BUY (cost basis)  → PTAX sell rate (cotação de venda)
 *   - SELL (proceeds)   → PTAX buy  rate (cotação de compra)
 *   - DIVIDEND received → PTAX buy  rate (cotação de compra)
 */
function getPtaxRateFromSnapshot(
  fxSnapshots: unknown,
  currency: string,
  txType: "BUY" | "SELL" | "DIVIDEND",
): number | null {
  if (!fxSnapshots || currency === "BRL") return null;
  const snapshots = fxSnapshots as FxSnapshots;
  const pair = `${currency}/BRL`;
  const entry = snapshots[pair];
  if (!entry) return null;
  return txType === "BUY" ? entry.sell : entry.buy;
}

export async function getReportsData(baseYear: number): Promise<ReportsData> {
  const userId = await getDefaultUserId();

  // Fetch all transactions up to the end of the base year
  const endOfYear = new Date(Date.UTC(baseYear, 11, 31, 23, 59, 59, 999));

  const transactions = await prisma.transaction.findMany({
    where: {
      account: {
        userId,
        currency: { not: "BRL" },
      },
      date: { lte: endOfYear },
    },
    include: { account: true },
    orderBy: { date: "asc" }, // Must process chronologically to compute average cost
  });

  // Track state per asset
  // Key: symbol
  const state = new Map<string, {
    type: string;
    broker: string;
    qty: number;
    totalCostBrl: number;
    prevYearTotalCostBrl: number; // Snapshot of totalCostBrl at the end of baseYear - 1
  }>();

  const capitalGains: CapitalGainEvent[] = [];
  const dividendsMap = new Map<string, DividendEvent>();
  const ptaxHistory: PtaxEvent[] = [];

  for (const tx of transactions) {
    const isBaseYear = tx.date.getUTCFullYear() === baseYear;
    const isPrevYearOrOlder = tx.date.getUTCFullYear() < baseYear;

    if (!state.has(tx.symbol)) {
      state.set(tx.symbol, {
        type: tx.instrumentType,
        broker: tx.account.name,
        qty: 0,
        totalCostBrl: 0,
        prevYearTotalCostBrl: 0,
      });
    }

    const asset = state.get(tx.symbol)!;

    // BUY uses PTAX sell rate; SELL and DIVIDEND use PTAX buy rate (Lei 14.754/2023)
    const useBuyRate = tx.type !== "BUY";
    let fxRate = getPtaxRateFromSnapshot(
      tx.fxSnapshots,
      tx.account.currency,
      tx.type as "BUY" | "SELL" | "DIVIDEND",
    );

    // Fallback: If snapshot is missing (e.g. weekend or not synced), find the most recent rate in history
    if (fxRate === null && tx.account.currency !== "BRL") {
      const fallbackRate = await prisma.fxRateHistory.findFirst({
        where: {
          currency: tx.account.currency,
          date: { lte: tx.date },
        },
        orderBy: { date: "desc" },
      });
      // Use buyRate for SELL/DIVIDEND proceeds, sellRate for BUY cost basis
      fxRate = useBuyRate
        ? (fallbackRate?.buyRate ?? 1)
        : (fallbackRate?.sellRate ?? 1);
    } else if (fxRate === null) {
      fxRate = 1; // BRL case
    }

    if (tx.type === "BUY") {
      const txTotalCostUsd = tx.quantity * tx.unitPrice + tx.fee;
      const txTotalCostBrl = txTotalCostUsd * fxRate;

      asset.qty += tx.quantity;
      asset.totalCostBrl += txTotalCostBrl;

      if (isBaseYear && tx.account.currency !== "BRL") {
        ptaxHistory.push({
          date: tx.date,
          type: "BUY",
          usdValue: txTotalCostUsd,
          ptaxRate: fxRate,
          brlValue: txTotalCostBrl,
        });
      }
    } else if (tx.type === "SELL") {
      const avgCostBrl = asset.qty > 0 ? asset.totalCostBrl / asset.qty : 0;
      const proportionalCostBrl = tx.quantity * avgCostBrl;

      asset.qty -= tx.quantity;
      asset.totalCostBrl -= proportionalCostBrl;

      // Prevent floating point anomalies making total cost slightly negative when qty is 0
      if (asset.qty <= 0.000001) {
        asset.qty = 0;
        asset.totalCostBrl = 0;
      }

      if (isBaseYear) {
        const saleValueUsd = tx.quantity * tx.unitPrice - tx.fee;
        const saleValueBrl = saleValueUsd * fxRate;
        const gainLossBrl = saleValueBrl - proportionalCostBrl;

        capitalGains.push({
          date: tx.date,
          symbol: tx.symbol,
          quantity: tx.quantity,
          saleValueBrl,
          costBrl: proportionalCostBrl,
          gainLossBrl,
          tax15Brl: gainLossBrl > 0 ? gainLossBrl * 0.15 : 0,
        });

        if (tx.account.currency !== "BRL") {
          ptaxHistory.push({
            date: tx.date,
            type: "SELL",
            usdValue: saleValueUsd,
            ptaxRate: fxRate,
            brlValue: saleValueBrl,
          });
        }
      }
    } else if (tx.type === "DIVIDEND" && isBaseYear) {
      const grossUsd = tx.quantity * tx.unitPrice;
      const grossBrl = grossUsd * fxRate;

      // Calculate tax withheld using the nraTax percentage (e.g., 0.3 for 30%)
      const taxWithheldUsd = grossUsd * (tx.nraTax ?? 0);
      const taxWithheldBrl = taxWithheldUsd * fxRate;

      if (!dividendsMap.has(tx.symbol)) {
        dividendsMap.set(tx.symbol, {
          symbol: tx.symbol,
          grossUsd: 0,
          grossBrl: 0,
          taxWithheldUsd: 0,
          taxWithheldBrl: 0,
        });
      }

      const div = dividendsMap.get(tx.symbol)!;
      div.grossUsd += grossUsd;
      div.grossBrl += grossBrl;
      div.taxWithheldUsd += taxWithheldUsd;
      div.taxWithheldBrl += taxWithheldBrl;

      if (tx.account.currency !== "BRL") {
        ptaxHistory.push({
          date: tx.date,
          type: "DIVIDEND",
          usdValue: grossUsd,
          ptaxRate: fxRate,
          brlValue: grossBrl,
        });
      }
    }

    // Capture the state at the end of the previous year
    if (isPrevYearOrOlder) {
      asset.prevYearTotalCostBrl = asset.totalCostBrl;
    }
  }

  const assets: AssetSummary[] = [];
  for (const [symbol, data] of state) {
    if (data.qty > 0 || data.prevYearTotalCostBrl > 0) {
      const avgCostBrl = data.qty > 0 ? data.totalCostBrl / data.qty : 0;
      assets.push({
        symbol,
        quantity: data.qty,
        totalCostBrl: data.totalCostBrl,
        avgCostBrl,
        prevYearTotalCostBrl: data.prevYearTotalCostBrl,
        variationBrl: data.totalCostBrl - data.prevYearTotalCostBrl,
      });
    }
  }

  // Sort by symbol
  assets.sort((a, b) => a.symbol.localeCompare(b.symbol));
  capitalGains.sort((a, b) => a.date.getTime() - b.date.getTime());
  const dividends = Array.from(dividendsMap.values());
  dividends.sort((a, b) => a.symbol.localeCompare(b.symbol));
  ptaxHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

  return { assets, capitalGains, dividends, ptaxHistory };
}
