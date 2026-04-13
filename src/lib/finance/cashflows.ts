import { calcTransactionTotal } from "@/domain/transaction/transaction.utils";
import type { CashFlow } from "./xirr";

/**
 * Minimal transaction shape required for XIRR cash-flow construction.
 * Kept intentionally narrow so callers don't need to pass full DB rows.
 */
export interface TransactionForCashFlow {
  type: string;
  date: Date | string;
  quantity: number;
  unitPrice: number;
  fee: number;
  nraTax?: number | null;
  isDrip: boolean;
  account: { currency: string };
}

/**
 * Builds the cash-flow array used to compute XIRR (annualized return) for a portfolio.
 *
 * Cash-flow sign convention (from the investor's perspective):
 *   - BUY  (non-DRIP)      → negative  (cash leaves wallet)
 *   - SELL                  → positive  (cash returns to wallet)
 *   - DIVIDEND (non-DRIP)   → positive  (income received)
 *   - Terminal portfolio value → positive  (hypothetical liquidation)
 *
 * DRIPs are excluded because they are internal reinvestments — no external cash moves.
 *
 * @param transactions     All transactions in the portfolio
 * @param fxRate           Function that converts a currency to the base currency (e.g. USD).
 *                         Should return the multiplier: `amount_in_ccy * fxRate(ccy) = amount_in_base`.
 * @param terminalValue    Current portfolio market value in base currency (added as a final positive cash flow at `asOf`).
 * @param asOf             Date for the terminal cash flow. Defaults to now.
 * @returns                Array of CashFlow entries ready for `xirr()`.
 */
export function buildXirrCashFlows(
  transactions: TransactionForCashFlow[],
  fxRate: (currency: string) => number,
  terminalValue: number,
  asOf: Date = new Date(),
): CashFlow[] {
  const cashFlows: CashFlow[] = [];

  for (const tx of transactions) {
    const amountBase = calcTransactionTotal(tx) * fxRate(tx.account.currency);

    if (tx.type === "BUY" && !tx.isDrip) {
      // Cash out of pocket into portfolio
      cashFlows.push({ amount: -amountBase, date: new Date(tx.date) });
    } else if (tx.type === "SELL") {
      // Cash out of portfolio into pocket
      cashFlows.push({ amount: amountBase, date: new Date(tx.date) });
    } else if (tx.type === "DIVIDEND" && !tx.isDrip) {
      // Cash dividend paid out to pocket
      cashFlows.push({ amount: amountBase, date: new Date(tx.date) });
    }
  }

  // Current portfolio value acts as a final withdrawal cash flow
  if (terminalValue > 0) {
    cashFlows.push({ amount: terminalValue, date: asOf });
  }

  return cashFlows;
}
