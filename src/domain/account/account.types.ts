// Domain types for Account entity

export type Account = {
  id: string;
  name: string;
  currency: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AccountWithTransactionCount = Account & {
  _count: { transactions: number };
};
