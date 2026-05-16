"use client"

import type {
  AllocationBucket,
  FireProjectionPoint,
  SpendingPowerPoint,
  WithdrawalProjectionPoint,
} from "@/domain/fire/fire.types"
import { getCurrencyLocale } from "@/lib/format"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const scenarioChartConfig = {
  bull: {
    label: "Bull",
    color: "var(--chart-2)",
  },
  base: {
    label: "Base",
    color: "var(--chart-1)",
  },
  bear: {
    label: "Bear",
    color: "var(--chart-3)",
  },
  fireTarget: {
    label: "FIRE target",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

const spendingPowerChartConfig = {
  nominal: {
    label: "Nominal",
    color: "var(--chart-1)",
  },
  real: {
    label: "Real",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

const allocationColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
]

function currencyFormatter(currency: string) {
  return new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
}

function yearLabelFormatter(label: unknown) {
  return `Year ${String(label)}`
}

function sanitizeMoney(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

interface FireProjectionChartProps {
  data: FireProjectionPoint[]
  currency: string
}

export function FireProjectionChart({
  data,
  currency,
}: FireProjectionChartProps) {
  const fmt = currencyFormatter(currency)
  const formatted = data.map((point) => ({
    ...point,
    bear: sanitizeMoney(point.bear),
    base: sanitizeMoney(point.base),
    bull: sanitizeMoney(point.bull),
    fireTarget: sanitizeMoney(point.fireTarget),
  }))

  return (
    <ChartContainer
      config={scenarioChartConfig}
      className="aspect-auto h-72 w-full"
    >
      <LineChart data={formatted} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={72}
          tickFormatter={(value: number) => fmt.format(value)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={yearLabelFormatter}
              formatter={(value) => fmt.format(Number(value))}
              indicator="line"
            />
          }
        />
        <Line
          dataKey="bear"
          type="monotone"
          stroke="var(--color-bear)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          dataKey="base"
          type="monotone"
          stroke="var(--color-base)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="bull"
          type="monotone"
          stroke="var(--color-bull)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          dataKey="fireTarget"
          type="monotone"
          stroke="var(--color-fireTarget)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

interface WithdrawalProjectionChartProps {
  data: WithdrawalProjectionPoint[]
  currency: string
}

export function WithdrawalProjectionChart({
  data,
  currency,
}: WithdrawalProjectionChartProps) {
  const fmt = currencyFormatter(currency)
  const formatted = data.map((point) => ({
    ...point,
    bear: sanitizeMoney(point.bear),
    base: sanitizeMoney(point.base),
    bull: sanitizeMoney(point.bull),
  }))

  return (
    <ChartContainer
      config={scenarioChartConfig}
      className="aspect-auto h-72 w-full"
    >
      <AreaChart data={formatted} margin={{ left: 8, right: 8 }}>
        <defs>
          <linearGradient id="fire-withdrawal-base" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-base)"
              stopOpacity={0.28}
            />
            <stop
              offset="95%"
              stopColor="var(--color-base)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={72}
          tickFormatter={(value: number) => fmt.format(value)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={yearLabelFormatter}
              formatter={(value) => fmt.format(Number(value))}
              indicator="line"
            />
          }
        />
        <Area
          dataKey="base"
          type="monotone"
          fill="url(#fire-withdrawal-base)"
          stroke="var(--color-base)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="bear"
          type="monotone"
          stroke="var(--color-bear)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          dataKey="bull"
          type="monotone"
          stroke="var(--color-bull)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}

interface SpendingPowerChartProps {
  data: SpendingPowerPoint[]
  currency: string
}

export function SpendingPowerChart({
  data,
  currency,
}: SpendingPowerChartProps) {
  const fmt = currencyFormatter(currency)
  const formatted = data.map((point) => ({
    ...point,
    nominal: sanitizeMoney(point.nominal),
    real: sanitizeMoney(point.real),
  }))

  return (
    <ChartContainer
      config={spendingPowerChartConfig}
      className="aspect-auto h-64 w-full"
    >
      <BarChart data={formatted} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={72}
          tickFormatter={(value: number) => fmt.format(value)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={yearLabelFormatter}
              formatter={(value) => fmt.format(Number(value))}
              indicator="dot"
            />
          }
        />
        <Bar
          dataKey="nominal"
          fill="var(--color-nominal)"
          radius={[4, 4, 0, 0]}
        />
        <Bar dataKey="real" fill="var(--color-real)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

interface FireAllocationDonutProps {
  data: AllocationBucket[]
  currency: string
}

export function FireAllocationDonut({
  data,
  currency,
}: FireAllocationDonutProps) {
  const fmt = currencyFormatter(currency)
  const total = data.reduce((sum, bucket) => sum + sanitizeMoney(bucket.value), 0)
  const chartData = data.map((bucket, index) => ({
    ...bucket,
    value: sanitizeMoney(bucket.value),
    pct: Number.isFinite(bucket.pct) ? Math.max(0, bucket.pct) : 0,
    fill: allocationColors[index % allocationColors.length],
  }))
  const chartConfig: ChartConfig = Object.fromEntries(
    chartData.map((bucket, index) => [
      bucket.key,
      {
        label: bucket.label,
        color: allocationColors[index % allocationColors.length],
      },
    ])
  )

  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No allocation data yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square h-56 max-h-56"
      >
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                nameKey="key"
                formatter={(value, name, item) => {
                  const payload = item.payload as AllocationBucket | undefined

                  return (
                    <span className="flex items-center gap-2">
                      <span className="font-medium">
                        {payload?.label ?? String(name)}
                      </span>
                      <span className="font-mono tabular-nums">
                        {fmt.format(Number(value))}
                      </span>
                    </span>
                  )
                }}
              />
            }
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="key"
            innerRadius="58%"
            outerRadius="82%"
            strokeWidth={2}
          >
            {chartData.map((bucket) => (
              <Cell key={bucket.key} fill={bucket.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="space-y-3">
        {chartData.map((bucket) => {
          const pct = total > 0 ? (bucket.value / total) * 100 : bucket.pct

          return (
            <div key={bucket.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: bucket.fill }}
                  />
                  <span className="truncate font-medium">{bucket.label}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3 tabular-nums">
                  <span className="text-muted-foreground">
                    {pct.toFixed(1)}%
                  </span>
                  <span className="w-24 text-right font-medium">
                    {fmt.format(bucket.value)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    backgroundColor: bucket.fill,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
