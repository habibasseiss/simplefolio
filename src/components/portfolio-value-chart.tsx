"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

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
import type { ChartPoint } from "@/lib/portfolio"

const chartConfig = {
  value: {
    label: "Market Value",
    color: "var(--chart-1)",
  },
  cost: {
    label: "Cost Basis",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface PortfolioValueChartProps {
  data: ChartPoint[]
  title?: string
  description?: string
  currency?: string
}

export function PortfolioValueChart({
  data,
  title,
  description = "Weekly market value vs cost basis",
  currency = "USD",
}: PortfolioValueChartProps) {
  if (data.length === 0) {
    return null
  }

  const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 })

  const formatted = data.map((d) => ({
    ...d,
    value: Math.max(0, d.value),
    cost: Math.max(0, d.cost),
  }))

  const latest = formatted[formatted.length - 1]
  const pnl = latest ? latest.value - latest.cost : 0
  const pnlPct = latest && latest.cost > 0 ? (pnl / latest.cost) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{description}</CardDescription>
        <CardTitle className="flex items-baseline gap-2 text-2xl tabular-nums">
          {title && <span className="text-lg font-semibold">{title}</span>}
          {fmt.format(latest?.value ?? 0)}
          {latest && (
            <span
              className={
                pnl >= 0
                  ? "text-sm font-normal text-green-600 dark:text-green-400"
                  : "text-sm font-normal text-red-600 dark:text-red-400"
              }
            >
              {pnl >= 0 ? "+" : ""}
              {fmt.format(pnl)} ({pnlPct >= 0 ? "+" : ""}
              {pnlPct.toFixed(2)}%)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-62.5 w-full"
        >
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(v: string) => {
                const d = new Date(v + "T00:00:00Z")
                return d.toLocaleDateString("en-US", {
                  month: "short",
                  year: "2-digit",
                  timeZone: "UTC",
                })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={70}
              tickFormatter={(v: number) => fmt.format(v)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => {
                    const d = new Date(String(label) + "T00:00:00Z")
                    return d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })
                  }}
                  formatter={(value: unknown) =>
                    fmt.format(typeof value === "number" ? value : 0)
                  }
                  indicator="dot"
                />
              }
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Area
              dataKey="cost"
              type="monotone"
              fill="url(#fillCost)"
              stroke="var(--chart-2)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Area
              dataKey="value"
              type="monotone"
              fill="url(#fillValue)"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
