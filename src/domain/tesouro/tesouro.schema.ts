import { z } from "zod";

/**
 * Validation schema for creating a Tesouro Direto bond transaction.
 *
 * Differences from `createTransactionSchema` (equities):
 *  - `bondName` replaces `symbol` (human-readable API name, e.g. "Tesouro Selic 2029").
 *    The canonical ticker stored in `Transaction.symbol` is derived by uppercasing and
 *    replacing spaces with underscores (e.g. "TESOURO_SELIC_2029") — no prefix needed.
 *  - `instrumentType` is hardcoded to "BOND"
 *  - `instrumentProvider` is hardcoded to "TESOURO"
 *  - `type` is limited to BUY / SELL (no DIVIDEND — interest accrues in the PU)
 *  - `nraTax` and `reinvestDividends` are not applicable
 */
export const createTesouroTransactionSchema = z.object({
  /** Human-readable bond title as returned by the Tesouro API, e.g. "Tesouro Selic 2029" */
  bondName: z.string().min(1, "Bond name is required"),
  instrumentType: z.literal("BOND").default("BOND"),
  instrumentProvider: z.literal("TESOURO").default("TESOURO"),
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

export const updateTesouroTransactionSchema =
  createTesouroTransactionSchema.partial();

export type CreateTesouroTransactionInput = z.infer<
  typeof createTesouroTransactionSchema
>;
export type UpdateTesouroTransactionInput = z.infer<
  typeof updateTesouroTransactionSchema
>;

/**
 * Converts a human-readable Tesouro Direto bond name to the canonical ticker
 * stored in the database. No prefix — just upper-snake_case.
 *
 * @example bondNameToTicker("Tesouro Selic 2029") // → "TESOURO_SELIC_2029"
 */
export function bondNameToTicker(bondName: string): string {
  return bondName.trim().toUpperCase().replace(/\s+/g, "_");
}

/**
 * Converts a canonical ticker back to the human-readable bond name.
 *
 * @example tickerToBondName("TESOURO_SELIC_2029") // → "Tesouro Selic 2029"
 */
export function tickerToBondName(ticker: string): string {
  return ticker
    .replace(/_/g, " ")
    .replace(/\w+/g, (word) => word.charAt(0) + word.slice(1).toLowerCase());
}
