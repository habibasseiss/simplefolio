"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { ListFilterIcon, XIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

type TxType = "BUY" | "SELL" | "DIVIDEND"
type AssetCategory = "stocks" | "bonds"

const ALL_TYPES: TxType[] = ["BUY", "SELL", "DIVIDEND"]
const ALL_CATEGORIES: AssetCategory[] = ["stocks", "bonds"]

const TYPE_LABELS: Record<TxType, string> = {
  BUY: "Buy",
  SELL: "Sell",
  DIVIDEND: "Dividend",
}

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  stocks: "Stocks & ETFs",
  bonds: "Tesouro Direto",
}

export function AccountTypeFilter({
  activeTypes,
  activeCategory,
}: {
  activeTypes: TxType[] | null
  activeCategory: AssetCategory[] | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentTypes = activeTypes ?? ALL_TYPES
  const currentCategory = activeCategory ?? ALL_CATEGORIES

  const applyParams = useCallback(
    (types: TxType[], categories: AssetCategory[]) => {
      const params = new URLSearchParams(searchParams.toString())
      if (types.length === 0 || types.length === ALL_TYPES.length) {
        params.delete("types")
      } else {
        params.set("types", types.join(","))
      }
      if (categories.length === 0 || categories.length === ALL_CATEGORIES.length) {
        params.delete("category")
      } else {
        params.set("category", categories.join(","))
      }
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const toggleType = useCallback(
    (type: TxType, checked: boolean) => {
      const next = checked
        ? [...currentTypes, type]
        : currentTypes.filter((t) => t !== type)
      applyParams(next, currentCategory)
    },
    [currentTypes, currentCategory, applyParams],
  )

  const toggleCategory = useCallback(
    (cat: AssetCategory, checked: boolean) => {
      const next = checked
        ? [...currentCategory, cat]
        : currentCategory.filter((c) => c !== cat)
      applyParams(currentTypes, next)
    },
    [currentTypes, currentCategory, applyParams],
  )

  const clearAll = useCallback(
    () => applyParams(ALL_TYPES, ALL_CATEGORIES),
    [applyParams],
  )

  const isFiltered = activeTypes !== null || activeCategory !== null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={isFiltered ? "secondary" : "outline"}
          size="icon"
          className="relative"
          aria-label="Filter transactions"
        >
          <ListFilterIcon />
          {isFiltered && (
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48">
        <p className="text-xs font-medium text-muted-foreground">
          Transaction Type
        </p>
        <div className="flex flex-col gap-2">
          {ALL_TYPES.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <Checkbox
                id={`type-${type}`}
                checked={currentTypes.includes(type)}
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
        <Separator className="my-3" />
        <p className="text-xs font-medium text-muted-foreground">
          Asset Type
        </p>
        <div className="flex flex-col gap-2">
          {ALL_CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${cat}`}
                checked={currentCategory.includes(cat)}
                onCheckedChange={(checked) => toggleCategory(cat, !!checked)}
              />
              <Label
                htmlFor={`cat-${cat}`}
                className="cursor-pointer font-normal"
              >
                {CATEGORY_LABELS[cat]}
              </Label>
            </div>
          ))}
        </div>
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full text-muted-foreground"
            onClick={clearAll}
          >
            <XIcon className="size-3.5" />
            Clear filters
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

