"use client"

import { InfoIcon } from "lucide-react"
import * as React from "react"

import {
  FireAllocationDonut,
  FireProjectionChart,
  SpendingPowerChart,
  WithdrawalProjectionChart,
} from "@/components/fire/fire-charts"
import { FireSummaryCards } from "@/components/fire/fire-summary-cards"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  AllocationBucket,
  FireAssumptions,
  WithdrawalStrategyName,
} from "@/domain/fire/fire.types"
import {
  buildFireMilestones,
  buildFireProjection,
  buildSpendingPower,
  buildWithdrawalProjection,
  buildWithdrawalTable,
  calculateFireSummary,
  getWithdrawalStrategy,
} from "@/domain/fire/fire.utils"
import { formatCurrency, formatNumber } from "@/lib/format"

const ASSUMPTIONS_STORAGE_KEY = "simplefolio.fire.assumptions.v1"

interface FirePlannerProps {
  currency: string
  currentPortfolio: number
  currentYear: number
  displayRate: number
  initialAssumptions: FireAssumptions
  allocationBuckets: AllocationBucket[]
}

export function FirePlanner({
  currency,
  currentPortfolio,
  currentYear,
  displayRate,
  initialAssumptions,
  allocationBuckets,
}: FirePlannerProps) {
  const [baseAssumptions, setBaseAssumptions] =
    React.useState(initialAssumptions)
  const [hasLoadedSavedAssumptions, setHasLoadedSavedAssumptions] =
    React.useState(false)
  const [strategyName, setStrategyName] =
    React.useState<WithdrawalStrategyName>("classic")

  React.useEffect(() => {
    const saved = window.localStorage.getItem(ASSUMPTIONS_STORAGE_KEY)
    if (!saved) {
      setHasLoadedSavedAssumptions(true)
      return
    }

    try {
      setBaseAssumptions((current) => ({
        ...current,
        ...parseSavedAssumptions(saved),
      }))
    } catch {
      window.localStorage.removeItem(ASSUMPTIONS_STORAGE_KEY)
    } finally {
      setHasLoadedSavedAssumptions(true)
    }
  }, [])

  React.useEffect(() => {
    if (!hasLoadedSavedAssumptions) return

    window.localStorage.setItem(
      ASSUMPTIONS_STORAGE_KEY,
      JSON.stringify(baseAssumptions),
    )
  }, [baseAssumptions, hasLoadedSavedAssumptions])

  const strategy = getWithdrawalStrategy(strategyName)
  const assumptions = {
    ...baseAssumptions,
    annualExpenses: baseAssumptions.annualExpenses * displayRate,
    monthlySavings: baseAssumptions.monthlySavings * displayRate,
  }
  const activeAssumptions = {
    ...assumptions,
    withdrawalRatePct: strategy.ratePct,
  }
  const summary = calculateFireSummary(
    currentPortfolio,
    activeAssumptions,
    currentYear,
  )
  const startYear = summary.estimatedFireYear ?? currentYear
  const retirementAge =
    assumptions.currentAge + Math.ceil(summary.yearsToFire ?? 0)
  const fireProjection = buildFireProjection(
    currentPortfolio,
    activeAssumptions,
    15,
    currentYear,
  )
  const milestones = buildFireMilestones(
    currentPortfolio,
    activeAssumptions,
    currentYear,
  )
  const withdrawalProjection = buildWithdrawalProjection(
    summary.fireNumber,
    strategy.ratePct,
    assumptions.inflationPct,
    40,
    startYear,
  )
  const spendingPower = buildSpendingPower(
    summary.safeAnnualWithdrawal,
    assumptions.inflationPct,
    30,
    startYear,
  )
  const tableRows = buildWithdrawalTable(
    summary.fireNumber,
    summary.safeAnnualWithdrawal,
    assumptions.expectedReturnPct,
    assumptions.inflationPct,
    10,
    startYear,
    retirementAge,
  )
  const remaining = Math.max(0, summary.fireNumber - currentPortfolio)
  const progress = Math.min(Math.max(summary.progressPct, 0), 100)

  function updateAssumption(key: keyof FireAssumptions, value: string) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return

    const nextValue =
      key === "annualExpenses" || key === "monthlySavings"
        ? parsed / displayRate
        : parsed

    setBaseAssumptions((current) => {
      const next = { ...current, [key]: nextValue }
      saveAssumptions(next)
      return next
    })
  }

  return (
    <Tabs defaultValue="accumulation" className="space-y-4">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="accumulation">Accumulation</TabsTrigger>
        <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
      </TabsList>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <TabsContent value="accumulation" className="m-0 space-y-4">
            <FireSummaryCards
              currency={currency}
              currentPortfolio={currentPortfolio}
              fireNumber={summary.fireNumber}
              yearsToFire={summary.yearsToFire}
              estimatedFireYear={summary.estimatedFireYear}
              progressPct={summary.progressPct}
              monthlySavings={assumptions.monthlySavings}
              safeAnnualWithdrawal={summary.safeAnnualWithdrawal}
            />

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>FIRE Progress Tracker</CardTitle>
                  <CardDescription>
                    Accumulation phase against your 25x target
                  </CardDescription>
                </div>
                <Badge variant={progress >= 100 ? "default" : "secondary"}>
                  {progress >= 100 ? "Reached" : "In Progress"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Journey to FIRE
                    </p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatCurrency(currentPortfolio, currency)}
                      <span className="text-base font-normal text-muted-foreground">
                        {" "}
                        / {formatCurrency(summary.fireNumber, currency)}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Still needed
                    </p>
                    <p className="font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                      {formatCurrency(remaining, currency)}
                    </p>
                  </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio Growth Projection</CardTitle>
                <CardDescription>
                  Bear, base, and bull scenarios versus your FIRE number
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
                  <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p>
                    <strong>
                      FIRE date: {summary.estimatedFireYear ?? "not reached"}.
                    </strong>{" "}
                    Based on{" "}
                    {formatCurrency(assumptions.monthlySavings, currency)}{" "}
                    monthly savings and a{" "}
                    {formatNumber(assumptions.expectedReturnPct, 1)}% expected
                    real return.
                  </p>
                </div>
                <FireProjectionChart data={fireProjection} currency={currency} />
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Milestones</CardTitle>
                  <CardDescription>
                    Portfolio targets on the path to FIRE
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {milestones.map((milestone) => (
                    <div
                      key={milestone.name}
                      className="grid grid-cols-[12px_1fr] gap-4"
                    >
                      <div className="pt-1.5">
                        <span
                          className={
                            milestone.status === "done"
                              ? "block size-3 rounded-full bg-green-600"
                              : milestone.status === "active"
                                ? "block size-3 rounded-full bg-primary ring-4 ring-primary/15"
                                : "block size-3 rounded-full bg-muted-foreground/30"
                          }
                        />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{milestone.name}</p>
                          <Badge
                            variant={
                              milestone.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {milestone.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                        <p className="text-sm font-medium tabular-nums text-primary">
                          {formatCurrency(milestone.target, currency)}
                          {milestone.estimatedYear
                            ? ` - Est. ${milestone.estimatedYear}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Allocation</CardTitle>
                  <CardDescription>
                    Boglehead-style fund buckets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FireAllocationDonut
                    data={allocationBuckets}
                    currency={currency}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="withdrawal" className="m-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Strategy</CardTitle>
                <CardDescription>
                  Choose a retirement spending approach
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {(["conservative", "classic", "flexible"] as const).map(
                    (name) => {
                      const option = getWithdrawalStrategy(name)

                      return (
                        <Button
                          key={name}
                          type="button"
                          variant={
                            strategyName === name ? "default" : "outline"
                          }
                          className="h-auto justify-start whitespace-normal p-4 text-left"
                          onClick={() => setStrategyName(name)}
                        >
                          <span>
                            <span className="block font-semibold">
                              {option.title}
                            </span>
                            <span className="block text-xs opacity-80">
                              {option.ratePct}% / year
                            </span>
                            <span className="mt-1 block text-xs opacity-80">
                              {option.description}
                            </span>
                          </span>
                        </Button>
                      )
                    },
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Risk of portfolio depletion
                    </span>
                    <Badge variant="secondary">{strategy.riskLabel}</Badge>
                  </div>
                  <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500">
                    <div
                      className="relative top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
                      style={{ left: `calc(${strategy.riskPct}% - 0.5rem)` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <WithdrawalMetricCard
                label="Annual Withdrawal"
                value={formatCurrency(summary.safeAnnualWithdrawal, currency)}
              />
              <WithdrawalMetricCard
                label="Monthly Equivalent"
                value={formatCurrency(
                  summary.safeAnnualWithdrawal / 12,
                  currency,
                )}
              />
              <WithdrawalMetricCard
                label="Withdrawal Rate"
                value={`${strategy.ratePct}%`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Depletion Simulation</CardTitle>
                  <CardDescription>
                    Starting at your FIRE number with inflation-adjusted
                    withdrawals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WithdrawalProjectionChart
                    data={withdrawalProjection}
                    currency={currency}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Annual Spending Power</CardTitle>
                  <CardDescription>
                    Nominal withdrawal versus current purchasing power
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SpendingPowerChart data={spendingPower} currency={currency} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Year-by-Year Projection</CardTitle>
                <CardDescription>
                  {strategy.ratePct}% rule - {assumptions.expectedReturnPct}%
                  return - {assumptions.inflationPct}% inflation
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead className="text-right">Start</TableHead>
                      <TableHead className="text-right">Withdrawal</TableHead>
                      <TableHead className="text-right">Growth</TableHead>
                      <TableHead className="text-right">End</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((row) => (
                      <TableRow key={row.year}>
                        <TableCell className="tabular-nums">
                          {row.year}
                        </TableCell>
                        <TableCell>{row.age}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.portfolioStart, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-orange-600 dark:text-orange-400">
                          -{formatCurrency(row.withdrawal, currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-green-600 dark:text-green-400">
                          +{formatCurrency(row.growth, currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(row.portfolioEnd, currency)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.status === "growing"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {row.status === "growing"
                              ? "Growing"
                              : "Declining"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </div>

        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader>
            <CardTitle>Assumptions</CardTitle>
            <CardDescription>Adjust model inputs</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <NumberField
              label="Annual Expenses"
              value={assumptions.annualExpenses}
              onChange={(value) => updateAssumption("annualExpenses", value)}
            />
            <NumberField
              label="Monthly Savings"
              value={assumptions.monthlySavings}
              onChange={(value) => updateAssumption("monthlySavings", value)}
            />
            <NumberField
              label="Expected Return %"
              value={assumptions.expectedReturnPct}
              onChange={(value) => updateAssumption("expectedReturnPct", value)}
            />
            <NumberField
              label="Inflation %"
              value={assumptions.inflationPct}
              onChange={(value) => updateAssumption("inflationPct", value)}
            />
            <NumberField
              label="Current Age"
              value={assumptions.currentAge}
              onChange={(value) => updateAssumption("currentAge", value)}
            />
          </CardContent>
        </Card>
      </div>
    </Tabs>
  )
}

function parseSavedAssumptions(saved: string): Partial<FireAssumptions> {
  const parsed = JSON.parse(saved) as Partial<Record<keyof FireAssumptions, unknown>>
  const next: Partial<FireAssumptions> = {}

  for (const key of [
    "annualExpenses",
    "monthlySavings",
    "expectedReturnPct",
    "inflationPct",
    "currentAge",
    "withdrawalRatePct",
  ] as const) {
    const value = parsed[key]
    if (typeof value === "number" && Number.isFinite(value)) {
      next[key] = value
    }
  }

  return next
}

function saveAssumptions(assumptions: FireAssumptions) {
  window.localStorage.setItem(
    ASSUMPTIONS_STORAGE_KEY,
    JSON.stringify(assumptions),
  )
}

function WithdrawalMetricCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: string) => void
}) {
  const id = React.useId()
  const [localValue, setLocalValue] = React.useState(() => String(value))
  const isFocused = React.useRef(false)

  React.useEffect(() => {
    if (!isFocused.current) {
      setLocalValue(String(value))
    }
  }, [value])

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={localValue}
        onFocus={() => {
          isFocused.current = true
        }}
        onBlur={() => {
          isFocused.current = false
          setLocalValue(String(value))
        }}
        onChange={(event) => {
          setLocalValue(event.target.value)
          onChange(event.target.value)
        }}
      />
    </div>
  )
}
