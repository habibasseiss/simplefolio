import { z } from "zod";
import { TRANSACTION_TYPES } from "./transaction.types";

export const createTransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  symbol: z.string().min(1, "Symbol is required").max(20).toUpperCase(),
  date: z.coerce.date(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  fee: z.coerce.number().min(0, "Fee cannot be negative").default(0),
  purchaseRate: z.number().min(0).nullable().optional(),
  nraTax: z.number().min(0).max(1).nullable().optional(),
  notes: z.string().max(500).optional(),
  reinvestDividends: z.boolean().default(false),
  isDrip: z.boolean().default(false),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
