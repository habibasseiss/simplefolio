"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ListFilterIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

export function SymbolAccountFilter({
  accounts,
  selectedAccountIds,
}: {
  accounts: { id: string; name: string }[]
  selectedAccountIds?: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedSet = useMemo(
    () => new Set(selectedAccountIds ?? accounts.map((a) => a.id)),
    [selectedAccountIds, accounts],
  )

  const applyAccounts = useCallback(
    (newSelectedIds: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      if (newSelectedIds.length === accounts.length) {
        params.delete("accounts")
      } else {
        params.set("accounts", newSelectedIds.join(","))
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams, accounts.length],
  )

  const toggleAccount = useCallback(
    (accountId: string) => {
      const newSelection = new Set(selectedSet)
      if (newSelection.has(accountId)) {
        newSelection.delete(accountId)
      } else {
        newSelection.add(accountId)
      }
      applyAccounts(Array.from(newSelection))
    },
    [selectedSet, applyAccounts],
  )

  const clearFilters = useCallback(() => {
    applyAccounts(accounts.map((a) => a.id))
  }, [accounts, applyAccounts])

  const hasFilters = !!selectedAccountIds && selectedAccountIds.length < accounts.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasFilters ? "secondary" : "outline"}
          size="icon"
          className="relative"
          aria-label="Filter by account"
        >
          <ListFilterIcon className="size-4" />
          {hasFilters && (
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium leading-none">Accounts</h4>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-primary"
                onClick={clearFilters}
              >
                Reset
              </Button>
            )}
          </div>
          <div className="grid gap-2">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`account-${account.id}`}
                  checked={selectedSet.has(account.id)}
                  onCheckedChange={() => toggleAccount(account.id)}
                />
                <Label
                  htmlFor={`account-${account.id}`}
                  className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {account.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
