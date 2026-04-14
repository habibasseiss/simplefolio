"use client";

import type { ActionResult } from "@/actions/account.actions";
import { TesouroBondCombobox } from "@/components/tesouro-bond-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bondTickerToName } from "@/domain/tesouro/tesouro.utils";
import { useActionState, useState } from "react";

function toDateInputValue(date: Date | string | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

interface BondResult {
  id: string;
  title: string;
  maturityDate: string;
  puCompra: number;
  taxaCompra: number;
}

interface TesouroBondTransactionFormProps {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  defaultValues?: {
    /** Canonical ticker, e.g. "TD:TESOURO_SELIC_2029" — decoded to name for display */
    symbol?: string;
    type?: "BUY" | "SELL";
    date?: Date | string;
    quantity?: number;
    unitPrice?: number;
    purchaseRate?: number | null;
    fee?: number;
    notes?: string | null;
  };
  accounts?: { id: string; name: string }[];
  defaultAccountId?: string;
  submitLabel?: string;
}

/**
 * Form for creating or editing a Tesouro Direto bond transaction.
 *
 * Mirrors `TransactionForm` but:
 * - Uses `TesouroBondCombobox` instead of `SymbolCombobox`
 * - Restricts type to BUY / SELL only
 * - Auto-populates `unitPrice` when a bond is selected from the combobox
 * - No NRA tax or DRIP options (not applicable to TD bonds)
 */
export function TesouroBondTransactionForm({
  action,
  defaultValues,
  accounts,
  defaultAccountId,
  submitLabel = "Save",
}: TesouroBondTransactionFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});

  const [selectedType, setSelectedType] = useState<"BUY" | "SELL">(
    defaultValues?.type ?? "BUY",
  );
  const [unitPrice, setUnitPrice] = useState<string>(
    defaultValues?.unitPrice?.toString() ?? "",
  );
  const [purchaseRate, setPurchaseRate] = useState<string>(
    defaultValues?.purchaseRate?.toString() ?? "",
  );

  // Derive the human-readable bond name from the stored ticker
  const defaultBondTitle = defaultValues?.symbol
    ? bondTickerToName(defaultValues.symbol)
    : undefined;

  function handleBondSelect(bond: BondResult) {
    // Auto-fill PU compra and contracted rate when the user selects a bond
    setUnitPrice(bond.puCompra.toFixed(2));
    setPurchaseRate(bond.taxaCompra.toFixed(4));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Account Selector */}
      {accounts && accounts.length > 1 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="accountId">Account</Label>
          <select
            id="accountId"
            name="accountId"
            defaultValue={defaultAccountId}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.accountId && (
            <p className="text-sm text-destructive">{state.fieldErrors.accountId[0]}</p>
          )}
        </div>
      )}

      {/* Transaction Type */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as "BUY" | "SELL")}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="BUY">Buy</option>
          <option value="SELL">Sell</option>
        </select>
        {state.fieldErrors?.type && (
          <p className="text-sm text-destructive">{state.fieldErrors.type[0]}</p>
        )}
      </div>

      {/* Bond Picker */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="bondTitle-display">Bond</Label>
        <TesouroBondCombobox
          defaultValue={defaultBondTitle}
          onBondSelect={handleBondSelect}
        />
        {state.fieldErrors?.bondTitle && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.bondTitle[0]}
          </p>
        )}
      </div>

      {/* Date */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          defaultValue={toDateInputValue(defaultValues?.date)}
          required
        />
        {state.fieldErrors?.date && (
          <p className="text-sm text-destructive">{state.fieldErrors.date[0]}</p>
        )}
      </div>

      {/* Quantity + Unit Price */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">Quantity (units)</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.01"
            defaultValue={defaultValues?.quantity}
            required
          />
          {state.fieldErrors?.quantity && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.quantity[0]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="unitPrice">Unit Price (BRL)</Label>
          <Input
            id="unitPrice"
            name="unitPrice"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            required
          />
          {state.fieldErrors?.unitPrice && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.unitPrice[0]}
            </p>
          )}
        </div>
      </div>

      {/* Purchase Rate */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="purchaseRate">Rate at Purchase — Taxa (optional)</Label>
        <Input
          id="purchaseRate"
          name="purchaseRate"
          type="number"
          step="0.0001"
          min="0"
          placeholder="e.g. 6.1200"
          value={purchaseRate}
          onChange={(e) => setPurchaseRate(e.target.value)}
        />
        {state.fieldErrors?.purchaseRate && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.purchaseRate[0]}
          </p>
        )}
      </div>

      {/* Fee */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="fee">
          {selectedType === "SELL" ? "Fee / Tax (optional)" : "Fee (optional)"}
        </Label>
        <Input
          id="fee"
          name="fee"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          defaultValue={defaultValues?.fee ?? 0}
        />
        {state.fieldErrors?.fee && (
          <p className="text-sm text-destructive">{state.fieldErrors.fee[0]}</p>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input
          id="notes"
          name="notes"
          placeholder="Any additional notes"
          defaultValue={defaultValues?.notes ?? ""}
        />
        {state.fieldErrors?.notes && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.notes[0]}
          </p>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
