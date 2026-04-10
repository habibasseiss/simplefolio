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

export function AllocationChart({
  data,
  currency = "USD",
}: AllocationChartProps) {
  const fmt = new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })


  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((item, i) => [
      item.symbol,
      { label: item.symbol, color: COLORS[i % COLORS.length] },
    ]),
  )

  if (data.length === 0) {
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
              data={data}
              dataKey="value"
              nameKey="symbol"
              innerRadius="56%"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="mt-4 space-y-2">
          {data.map((item, i) => (
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
                  href={`/symbol/${item.symbol}`}
                  className="font-semibold hover:underline"
                >
                  {item.symbol.startsWith("TD:") ? item.name : item.symbol}
                </Link>
                {!item.symbol.startsWith("TD:") && item.name && (
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
