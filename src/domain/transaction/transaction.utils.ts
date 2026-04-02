import type { TransactionType } from "./transaction.types";

interface TransactionForTotal {
  type: TransactionType | string;
  quantity: number;
  unitPrice: number;
  fee: number;
  nraTax?: number | null;
}

/**
 * Calculates the net monetary effect of a transaction:
 * - BUY:      quantity × unitPrice + fee   (cash out)
 * - SELL:     quantity × unitPrice − fee   (cash in)
 * - DIVIDEND: quantity × unitPrice × (1 − nraTax)  (net after withholding)
 */
export function calcTransactionTotal(tx: TransactionForTotal): number {
  const gross = tx.quantity * tx.unitPrice;
  if (tx.type === "SELL") return gross - tx.fee;
  if (tx.type === "DIVIDEND") {
    const withholdingRate = tx.nraTax ?? 0;
    return gross * (1 - withholdingRate);
  }
  // BUY (and any unknown future type)
  return gross + tx.fee;
}
