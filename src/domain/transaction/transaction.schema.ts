import { z } from "zod";
import { TRANSACTION_TYPES } from "./transaction.types";

export const createTransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  symbol: z.string().min(1, "Symbol is required").max(20).toUpperCase(),
  date: z.coerce.date(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().positive("Unit price must be positive"),
  fee: z.coerce.number().min(0, "Fee cannot be negative").default(0),
  notes: z.string().max(500).optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
