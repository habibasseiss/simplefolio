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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type { ChartPoint } from "@/lib/portfolio"
import * as React from "react"

const chartConfig = {
  performance: {
    label: "Return",
    color: "transparent",
  },
} satisfies ChartConfig

const GREEN = "#16a34a"
const RED = "var(--destructive)"

interface PortfolioPerformanceChartProps {
  data: ChartPoint[]
  description?: string
}

export function PortfolioPerformanceChart({
  data,
  description = "Weekly portfolio return vs cost basis",
}: PortfolioPerformanceChartProps) {
  const [timeRange, setTimeRange] = React.useState("Total")

  const filteredData = React.useMemo(() => {
    if (timeRange === "Total" || data.length === 0) return data

    const latestDateStr = data[data.length - 1].date
    const latestDate = new Date(latestDateStr + "T00:00:00Z")
    let cutoffDate = new Date(latestDate)

    if (timeRange === "YTD") {
      cutoffDate = new Date(Date.UTC(latestDate.getUTCFullYear(), 0, 1))
    } else if (timeRange === "1Y") {
      cutoffDate.setUTCFullYear(latestDate.getUTCFullYear() - 1)
    } else if (timeRange === "3Y") {
      cutoffDate.setUTCFullYear(latestDate.getUTCFullYear() - 3)
    } else if (timeRange === "5Y") {
      cutoffDate.setUTCFullYear(latestDate.getUTCFullYear() - 5)
    }

    return data.filter((d) => new Date(d.date + "T00:00:00Z") >= cutoffDate)
  }, [data, timeRange])

  if (filteredData.length === 0) {
    return null
  }

  const rawFormatted = filteredData.map((d) => ({
    date: d.date,
    performance: d.cost > 0 ? ((d.value - d.cost) / d.cost) * 100 : 0,
  }))

  // Re-baseline so the first visible point is always 0%
  const basePerf = rawFormatted[0]?.performance ?? 0
  const formatted = rawFormatted.map((d) => ({
    ...d,
    performance: d.performance - basePerf,
  }))

  const latestPct = formatted[formatted.length - 1]?.performance ?? 0

  const isPositive = latestPct >= 0

  // Calculate where 0% sits in the chart (0 = top, 1 = bottom) for the gradient
  const perfValues = formatted.map((d) => d.performance)
  const minPerf = Math.min(...perfValues)
  const maxPerf = Math.max(...perfValues)
  const range = maxPerf - minPerf
  const zeroOffset =
    range > 0 && minPerf < 0 && maxPerf > 0
      ? maxPerf / range
      : maxPerf <= 0
        ? 0
        : 1
  const zeroPct = `${(zeroOffset * 100).toFixed(2)}%`

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex flex-col gap-1">
          <CardDescription>{description}</CardDescription>
          <CardTitle
            className={`text-2xl tabular-nums ${isPositive
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
              }`}
          >
            {isPositive ? "+" : ""}
            {latestPct.toFixed(2)}%
          </CardTitle>
        </div>
        <ToggleGroup
          type="single"
          value={timeRange}
          onValueChange={(v) => {
            if (v) setTimeRange(v)
          }}
          variant="outline"
          size="sm"
          className="hidden sm:flex"
        >
          <ToggleGroupItem value="YTD" className="px-2 sm:px-3 text-xs">YTD</ToggleGroupItem>
          <ToggleGroupItem value="1Y" className="px-2 sm:px-3 text-xs">1Y</ToggleGroupItem>
          <ToggleGroupItem value="3Y" className="px-2 sm:px-3 text-xs">3Y</ToggleGroupItem>
          <ToggleGroupItem value="5Y" className="px-2 sm:px-3 text-xs">5Y</ToggleGroupItem>
          <ToggleGroupItem value="Total" className="px-2 sm:px-3 text-xs">Total</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-62.5 w-full"
        >
          <AreaChart data={formatted}>
            <defs>
              {/* Stroke gradient: green above 0%, red below */}
              <linearGradient id="strokePerformance" x1="0" y1="0" x2="0" y2="1">
                <stop offset={zeroPct} stopColor={GREEN} />
                <stop offset={zeroPct} stopColor={RED} />
              </linearGradient>
              {/* Fill gradient: green-tinted above 0%, red-tinted below */}
              <linearGradient id="fillPerformance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.25} />
                <stop offset={zeroPct} stopColor={GREEN} stopOpacity={0.05} />
                <stop offset={zeroPct} stopColor={RED} stopOpacity={0.05} />
                <stop offset="100%" stopColor={RED} stopOpacity={0.25} />
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
              width={55}
              tickFormatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
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
                  formatter={(value: unknown) => {
                    const v = typeof value === "number" ? value : 0
                    return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
                  }}
                  indicator="dot"
                />
              }
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Area
              dataKey="performance"
              type="monotone"
              fill="url(#fillPerformance)"
              stroke="url(#strokePerformance)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
