"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ListFilterIcon, XIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

type TxType = "BUY" | "SELL" | "DIVIDEND"

const ALL_TYPES: TxType[] = ["BUY", "SELL", "DIVIDEND"]

const TYPE_LABELS: Record<TxType, string> = {
  BUY: "Buy",
  SELL: "Sell",
  DIVIDEND: "Dividend",
}

export function AccountTypeFilter({
  activeTypes,
}: {
  activeTypes: TxType[] | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const current = activeTypes ?? ALL_TYPES

  const applyTypes = useCallback(
    (types: TxType[]) => {
      const params = new URLSearchParams(searchParams.toString())
      if (types.length === 0 || types.length === ALL_TYPES.length) {
        params.delete("types")
      } else {
        params.set("types", types.join(","))
      }
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const toggleType = useCallback(
    (type: TxType, checked: boolean) => {
      const next = checked
        ? [...current, type]
        : current.filter((t) => t !== type)
      applyTypes(next)
    },
    [current, applyTypes],
  )

  const clearFilter = useCallback(() => applyTypes(ALL_TYPES), [applyTypes])

  const isFiltered = activeTypes !== null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={isFiltered ? "secondary" : "outline"}
          size="icon"
          className="relative"
          aria-label="Filter by type"
        >
          <ListFilterIcon />
          {isFiltered && (
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44">
        <p className="text-xs font-medium text-muted-foreground">
          Transaction Type
        </p>
        <div className="flex flex-col gap-2">
          {ALL_TYPES.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <Checkbox
                id={`type-${type}`}
                checked={current.includes(type)}
                onCheckedChange={(checked) => toggleType(type, !!checked)}
              />
              <Label
                htmlFor={`type-${type}`}
                className="cursor-pointer font-normal"
              >
                {TYPE_LABELS[type]}
              </Label>
            </div>
          ))}
        </div>
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={clearFilter}
          >
            <XIcon className="size-3.5" />
            Clear filter
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

