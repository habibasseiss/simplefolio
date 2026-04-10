"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

interface CurrencyToggleProps {
  currencies: string[]
  activeCurrency: string
}

export function CurrencyToggle({ currencies, activeCurrency }: CurrencyToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = useCallback(
    (value: string) => {
      if (!value) return
      const params = new URLSearchParams(searchParams.toString())
      if (value === currencies[0]) {
        // default currency — remove param to keep URL clean
        params.delete("currency")
      } else {
        params.set("currency", value)
      }
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false })
    },
    [router, pathname, searchParams, currencies],
  )

  if (currencies.length <= 1) return null

  return (
    <ToggleGroup
      type="single"
      value={activeCurrency}
      onValueChange={handleChange}
      variant="outline"
    >
      {currencies.map((c) => (
        <ToggleGroupItem key={c} value={c} className="text-xs font-medium">
          {c}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
