// Domain types for Transaction entity

export const TRANSACTION_TYPES = ["BUY", "SELL", "DIVIDEND"] as const;
// AUTO_BUY is created internally by DRIP (Dividend Reinvestment Plan) — not user-selectable.
export const ALL_TRANSACTION_TYPES = [
  ...TRANSACTION_TYPES,
  "AUTO_BUY",
] as const;
export type TransactionType = (typeof ALL_TRANSACTION_TYPES)[number];

export type Transaction = {
  id: string;
  type: TransactionType;
  symbol: string;
  date: Date;
  quantity: number;
  unitPrice: number;
  fee: number;
  nraTax: number | null;
  notes: string | null;
  reinvestDividends: boolean;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
};
