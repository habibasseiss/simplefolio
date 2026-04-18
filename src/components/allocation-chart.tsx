"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { getCurrencyLocale } from "@/lib/format"
import Link from "next/link"
import { Cell, Pie, PieChart } from "recharts"

export interface AllocationItem {
  symbol: string
  instrumentType: string // "EQUITY" | "BOND"
  name: string | null
  value: number
  pct: number
}

interface AllocationChartProps {
  data: AllocationItem[]
  currency?: string
}

// 10-slot color palette cycling through chart CSS variables
const COLORS = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5].map((n) => `var(--chart-${n})`)

/**
 * Groups bond entries by base type within the same instrument type.
 * e.g. "TESOURO_IPCA+_2029" and "TESOURO_IPCA+_2035" merge into "TESOURO_IPCA+".
 * Equity entries pass through unchanged.
 */
function groupBondsByType(data: AllocationItem[]): AllocationItem[] {
  const result = new Map<string, AllocationItem>()
  for (const item of data) {
    if (item.instrumentType === "BOND") {
      // Strip trailing 4-digit year to get a base type key
      const baseSymbol = item.symbol.replace(/_\d{4}$/, "")
      const baseName = item.name
        ? item.name.replace(/\s+\d{4}$/, "")
        : baseSymbol.replace(/_/g, " ")
      const existing = result.get(baseSymbol)
      if (existing) {
        existing.value += item.value
        existing.pct += item.pct
      } else {
        result.set(baseSymbol, {
          symbol: baseSymbol,
          instrumentType: "BOND",
          name: baseName,
          value: item.value,
          pct: item.pct,
        })
      }
    } else {
      result.set(item.symbol, { ...item })
    }
  }
  return Array.from(result.values())
}

export function AllocationChart({
  data,
  currency = "USD",
}: AllocationChartProps) {
  const grouped = groupBondsByType(data)
  const fmt = new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })


  const chartConfig: ChartConfig = Object.fromEntries(
    grouped.map((item, i) => [
      item.symbol,
      { label: item.symbol, color: COLORS[i % COLORS.length] },
    ]),
  )

  if (grouped.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Allocation</CardTitle>
          <CardDescription>
            Sync price history to see portfolio allocation.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Allocation</CardTitle>
        <CardDescription>Portfolio breakdown by position value</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-44"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <span className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{name}</span>
                      <span>{fmt.format(value as number)}</span>
                    </span>
                  )}
                />
              }
            />
            <Pie
              data={grouped}
              dataKey="value"
              nameKey="symbol"
              innerRadius="56%"
              strokeWidth={2}
            >
              {grouped.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="mt-4 space-y-2">
          {grouped.map((item, i) => (
            <div
              key={item.symbol}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <Link
                  href={
                    item.instrumentType === "BOND"
                      ? "/holdings"
                      : `/symbol/${item.symbol}`
                  }
                  className="font-semibold hover:underline"
                >
                  {item.instrumentType === "BOND" ? item.name : item.symbol}
                </Link>
                {item.instrumentType === "EQUITY" && item.name && (
                  <span className="truncate text-muted-foreground">
                    {item.name}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-right">
                <span className="text-muted-foreground">
                  {item.pct.toFixed(1)}%
                </span>
                <span className="w-20 font-medium tabular-nums">
                  {fmt.format(item.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
