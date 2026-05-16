"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect } from "react"

const CURRENCY_STORAGE_KEY = "simplefolio.displayCurrency.v1"

interface CurrencyToggleProps {
  currencies: string[]
  activeCurrency: string
}

export function CurrencyToggle({ currencies, activeCurrency }: CurrencyToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const rawCurrency = searchParams.get("currency")
    const savedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY)

    if (rawCurrency) {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, activeCurrency)
      return
    }

    if (
      savedCurrency &&
      savedCurrency !== activeCurrency &&
      currencies.includes(savedCurrency)
    ) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("currency", savedCurrency)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [activeCurrency, currencies, pathname, router, searchParams])

  const handleChange = useCallback(
    (value: string) => {
      if (!value) return
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, value)
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
