import {
  CalendarClockIcon,
  PiggyBankIcon,
  TargetIcon,
  TrendingUpIcon,
  UmbrellaIcon,
  WalletIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

interface FireSummaryCardsProps {
  currency: string
  currentPortfolio: number
  fireNumber: number
  yearsToFire: number | null
  estimatedFireYear: number | null
  progressPct: number
  monthlySavings: number
  safeAnnualWithdrawal: number
}

export function FireSummaryCards({
  currency,
  currentPortfolio,
  fireNumber,
  yearsToFire,
  estimatedFireYear,
  progressPct,
  monthlySavings,
  safeAnnualWithdrawal,
}: FireSummaryCardsProps) {
  const cards = [
    {
      label: "Current Portfolio",
      value: formatCurrency(currentPortfolio, currency),
      detail: "Live portfolio value",
      icon: WalletIcon,
    },
    {
      label: "FIRE Number",
      value: formatCurrency(fireNumber, currency),
      detail: "25x annual expenses",
      icon: TargetIcon,
    },
    {
      label: "Years to FIRE",
      value: yearsToFire === null ? "—" : `${yearsToFire.toFixed(1)} yrs`,
      detail:
        estimatedFireYear === null
          ? "Needs more savings data"
          : `Est. ${estimatedFireYear}`,
      icon: CalendarClockIcon,
    },
    {
      label: "Progress",
      value: `${Math.min(progressPct, 999).toFixed(0)}%`,
      detail: "of FIRE number reached",
      icon: TrendingUpIcon,
    },
    {
      label: "Monthly Savings",
      value: formatCurrency(monthlySavings, currency),
      detail: "Editable assumption",
      icon: PiggyBankIcon,
    },
    {
      label: "Safe Withdrawal",
      value: formatCurrency(safeAnnualWithdrawal, currency),
      detail: "Year-one annual spending",
      icon: UmbrellaIcon,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="space-y-0 pb-2">
            <CardDescription className="flex items-center gap-2">
              <card.icon className="size-4" />
              {card.label}
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {card.detail}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
