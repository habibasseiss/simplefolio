"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { getCurrencyLocale } from "@/lib/format"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

export interface MonthlyInvestmentChartProps {
  data: { month: string; amount: number }[]
  currency?: string
}

const chartConfig = {
  amount: {
    label: "Invested",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export function MonthlyInvestmentChart({
  data,
  currency = "USD",
}: MonthlyInvestmentChartProps) {
  const fmt = new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })

  const total = data.reduce((acc, d) => acc + d.amount, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>Monthly investments — last 12 months</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {fmt.format(total)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">total</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
          <BarChart data={data} margin={{ top: 24 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => fmt.format(v)}
              width={72}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => fmt.format(value as number)}
                />
              }
            />
            <Bar dataKey="amount" fill="var(--color-amount)" radius={4}>
              <LabelList
                dataKey="amount"
                position="top"
                offset={6}
                className="fill-foreground"
                fontSize={10}
                formatter={(v) => (typeof v === "number" && v > 0 ? fmt.format(v) : "")}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
