"use client"

import type { ActionResult } from "@/actions/account.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useActionState } from "react"

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF", "JPY", "BRL"]

interface AccountFormProps {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>
  defaultValues?: {
    name?: string
    currency?: string
  }
  submitLabel?: string
}

export function AccountForm({
  action,
  defaultValues,
  submitLabel = "Save",
}: AccountFormProps) {
  const [state, formAction, isPending] = useActionState(action, {})

  return (
    <form action={formAction} className="flex flex-col gap-6 max-w-md">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Account Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Brokerage Account"
          defaultValue={defaultValues?.name}
          required
        />
        {state.fieldErrors?.name && (
          <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="currency">Currency</Label>
        <select
          id="currency"
          name="currency"
          defaultValue={defaultValues?.currency ?? "USD"}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {state.fieldErrors?.currency && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.currency[0]}
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
