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
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

interface DividendIncomeChartProps {
  data: { year: string; amount: number }[]
  currency?: string
}

const chartConfig = {
  amount: {
    label: "Dividends",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export function DividendIncomeChart({
  data,
  currency = "USD",
}: DividendIncomeChartProps) {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dividend Income</CardTitle>
          <CardDescription>No dividend transactions recorded yet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const latestYear = data[data.length - 1]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>Annual dividend income</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {fmt.format(latestYear?.amount ?? 0)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {latestYear?.year}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-48 w-full"
        >
          <BarChart data={data} margin={{ top: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={60}
              tickFormatter={(v: number) => fmt.format(v)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => fmt.format(value as number)}
                />
              }
            />
            <Bar dataKey="amount" fill="var(--chart-3)" radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="amount"
                position="top"
                formatter={(v: unknown) =>
                  typeof v === "number" ? fmt.format(v) : ""
                }
                className="fill-foreground text-xs"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
