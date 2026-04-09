// Domain types for Transaction entity

export const TRANSACTION_TYPES = ["BUY", "SELL", "DIVIDEND"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type Transaction = {
  id: string;
  type: TransactionType;
  symbol: string;
  date: Date;
  quantity: number;
  unitPrice: number;
  fee: number;
  purchaseRate: number | null;
  nraTax: number | null;
  notes: string | null;
  reinvestDividends: boolean;
  isDrip: boolean;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
};
