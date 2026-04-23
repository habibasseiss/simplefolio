import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { TrendingUpIcon } from "lucide-react"

export interface PortfolioStatsProps {
  /** Earliest BUY transaction timestamp (ms since epoch), or null if no BUY transactions */
  firstInvestmentTs: number | null
  /** Total invested capital in display currency */
  investment: number
  /** Unrealized P&L + total dividends received, in display currency */
  grossPerformance: number
  /** Current portfolio value in display currency */
  netWorth: number
  /** Pre-computed XIRR (money-weighted annualized return), or null if it cannot be calculated */
  annualizedReturn: number | null
  /** Cumulative Time-Weighted Return (TWR), or null if no data */
  twr: number | null
  /** Total dividends received all-time */
  totalDividends: number
  currency: string
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums text-right">{children}</span>
    </div>
  )
}

function formatYears(ts: number): string {
  const ms = Date.now() - ts
  const years = ms / (1000 * 60 * 60 * 24 * 365.25)
  if (years < 1) {
    const months = Math.floor(years * 12)
    return months <= 1 ? "1 month" : `${months} months`
  }
  const y = Math.floor(years)
  const months = Math.round((years - y) * 12)
  if (months === 0) return y === 1 ? "1 year" : `${y} years`
  return `${y}y ${months}m`
}

export function PortfolioStatsCard({
  firstInvestmentTs,
  investment,
  grossPerformance,
  netWorth,
  annualizedReturn,
  twr,
  totalDividends,
  currency,
}: PortfolioStatsProps) {
  const grossPct = investment > 0 ? (grossPerformance / investment) * 100 : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="size-4 text-muted-foreground" />
          <CardTitle>Performance Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Row label="Time in Market">{firstInvestmentTs !== null ? formatYears(firstInvestmentTs) : "—"}</Row>
        <Row label="Total Cost Basis">{formatCurrency(investment, currency)}</Row>
        <Row label="Net Worth">{formatCurrency(netWorth, currency)}</Row>
        <Row label="Total Dividends">
          <span className="text-blue-600 dark:text-blue-400">
            {formatCurrency(totalDividends, currency)}
          </span>
        </Row>
        <Row label="Absolute Gross Performance">
          <span className={grossPerformance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
            {grossPerformance >= 0 ? "+" : ""}
            {formatCurrency(grossPerformance, currency)}
            {grossPct !== null && (
              <span className="ml-1.5 text-xs opacity-80">
                ({grossPct >= 0 ? "+" : ""}{grossPct.toFixed(2)}%)
              </span>
            )}
          </span>
        </Row>
        <Row label="Time-Weighted Return (TWR)">
          {twr !== null ? (
            <span className={twr >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {twr >= 0 ? "+" : ""}
              {(twr * 100).toFixed(2)}%
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>
        <Row label="Annualized Performance (XIRR)">
          {annualizedReturn !== null ? (
            <span className={annualizedReturn >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {annualizedReturn >= 0 ? "+" : ""}
              {(annualizedReturn * 100).toFixed(2)}% / yr
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>
      </CardContent>
    </Card>
  )
}
