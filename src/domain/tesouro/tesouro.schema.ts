import { z } from "zod";

/**
 * Validation schema for creating a Tesouro Direto bond transaction.
 *
 * Differences from `createTransactionSchema` (stocks):
 *  - `bondTitle` replaces `symbol` (human-readable API name)
 *  - `type` is limited to BUY / SELL (no DIVIDEND — interest accrues in the PU)
 *  - `nraTax` and `reinvestDividends` are not applicable
 */
export const createTesouroTransactionSchema = z.object({
  /** Human-readable bond title as returned by the Tesouro API, e.g. "Tesouro Selic 2029" */
  bondTitle: z.string().min(1, "Bond title is required").max(200),
  type: z.enum(["BUY", "SELL"]),
  date: z.coerce.date(),
  /** Number of bond units (min 0.01 per Tesouro Direto rules) */
  quantity: z.coerce
    .number()
    .positive("Quantity must be positive")
    .min(0.01, "Minimum quantity is 0.01 units"),
  /** PU (Preço Unitário) at time of purchase, in BRL */
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  fee: z.coerce.number().min(0, "Fee cannot be negative").default(0),
  /** Contracted yield rate at purchase time, e.g. 6.12 for IPCA+6.12% */
  purchaseRate: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const updateTesouroTransactionSchema = createTesouroTransactionSchema
  .partial();

export type CreateTesouroTransactionInput = z.infer<
  typeof createTesouroTransactionSchema
>;
export type UpdateTesouroTransactionInput = z.infer<
  typeof updateTesouroTransactionSchema
>;
