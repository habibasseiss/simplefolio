"use client"

import type { ActionResult } from "@/actions/account.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Transaction } from "@/domain/transaction/transaction.types"
import { TRANSACTION_TYPES } from "@/domain/transaction/transaction.types"
import { useActionState, useState } from "react"

function toDateInputValue(date: Date | string | undefined) {
  if (!date) return ""
  return new Date(date).toISOString().slice(0, 10)
}

interface TransactionFormProps {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
  defaultValues?: Partial<Transaction>
  submitLabel?: string
  nraTaxRate?: number | null
}

export function TransactionForm({
  action,
  defaultValues,
  submitLabel = "Save",
  nraTaxRate,
}: TransactionFormProps) {
  const [state, formAction, isPending] = useActionState(action, {})
  const [selectedType, setSelectedType] = useState(
    defaultValues?.type ?? "BUY",
  )

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-md">
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        {state.fieldErrors?.type && (
          <p className="text-sm text-destructive">{state.fieldErrors.type[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="symbol">Symbol / ISIN</Label>
        <Input
          id="symbol"
          name="symbol"
          placeholder="e.g. AAPL or US0378331005"
          defaultValue={defaultValues?.symbol}
          required
        />
        {state.fieldErrors?.symbol && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.symbol[0]}
          </p>
        )}
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            min="0"
            placeholder="0"
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
          <Label htmlFor="unitPrice">Unit Price</Label>
          <Input
            id="unitPrice"
            name="unitPrice"
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            defaultValue={defaultValues?.unitPrice}
            required
          />
          {state.fieldErrors?.unitPrice && (
            <p className="text-sm text-destructive">
              {state.fieldErrors.unitPrice[0]}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fee">Fee (optional)</Label>
        <Input
          id="fee"
          name="fee"
          type="number"
          step="any"
          min="0"
          placeholder="0.00"
          defaultValue={defaultValues?.fee ?? 0}
        />
        {state.fieldErrors?.fee && (
          <p className="text-sm text-destructive">{state.fieldErrors.fee[0]}</p>
        )}
      </div>

      {selectedType === "DIVIDEND" && nraTaxRate != null && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="applyNraTax"
            name="applyNraTax"
            className="size-4 rounded border-input accent-primary"
            defaultChecked={defaultValues?.nraTax != null}
          />
          <Label htmlFor="applyNraTax">
            Apply NRA tax withholding ({(nraTaxRate * 100).toFixed(0)}%)
          </Label>
        </div>
      )}

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
  )
}
