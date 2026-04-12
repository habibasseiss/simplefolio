import { AllocationChart } from "@/components/allocation-chart"
import { CurrencyToggle } from "@/components/currency-toggle"
import { DividendIncomeChart } from "@/components/dividend-income-chart"
import { SetActions, SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { PortfolioStatsCard } from "@/components/portfolio-stats-card"
import { PortfolioValueChart } from "@/components/portfolio-value-chart"
import { TransactionTypeBadge } from "@/components/transaction-type-badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { calcTransactionTotal } from "@/domain/transaction/transaction.utils"
import { DISPLAY_CURRENCIES, resolveDisplayCurrency } from "@/lib/display-currencies"
import { formatCurrency, formatDate, formatNumber } from "@/lib/format"
import { getExchangeRate, getRatesTo } from "@/lib/fx"
import { computeOverallChart } from "@/lib/portfolio"
import { findPriceHistory } from "@/repositories/price-history.repository"
import { findSymbolsByTickers } from "@/repositories/symbol.repository"
import {
  findAllSymbols,
  findAllTransactionsForUser,
} from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MinusIcon,
  PlusIcon,
  WalletIcon,
} from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import { xirr, type CashFlow } from "@/lib/finance/xirr"

// Currencies available for display — see src/lib/display-currencies.ts

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string }>
}) {
  const { currency: rawCurrency } = await searchParams

  const displayCurrency = resolveDisplayCurrency(rawCurrency)

  const userId = await getDefaultUserId()

  const [allTransactions, symbols] = await Promise.all([
    findAllTransactionsForUser(userId),
    findAllSymbols(userId),
  ])

  // Fetch price history and symbol names in parallel
  const [priceHistories, symbolRows] = await Promise.all([
    Promise.all(symbols.map((s) => findPriceHistory(s))),
    findSymbolsByTickers(symbols),
  ])

  const priceHistoryMap = new Map(
    symbols.map((s, i) => [s, priceHistories[i]]),
  )
  const nameMap = new Map(symbolRows.map((s) => [s.ticker, s.name]))

  // ── FX rates (cached 24 h each) ───────────────────────────────────────
  // Collect every currency we need to convert to USD:
  //   - price history currencies (for position values)
  //   - account currencies (for cost basis)
  const priceCurrencies = symbols.map(
    (s) => priceHistoryMap.get(s)?.at(-1)?.currency ?? "USD",
  )
  const accountCurrencies = allTransactions.map((tx) => tx.account.currency)
  // Core FX rates: everything → USD (the internal accounting currency)
  const fxRates = await getRatesTo(
    [...priceCurrencies, ...accountCurrencies],
    "USD",
  )
  const rate = (ccy: string) => fxRates.get(ccy) ?? 1

  // Display FX rate: USD → selected display currency
  const displayRate = await getExchangeRate("USD", displayCurrency)

  // ── Per-symbol positions (all monetary values in USD) ─────────────────
  const positions = symbols
    .map((symbol, idx) => {
      const txs = allTransactions
        .filter(
          (tx) =>
            tx.symbol === symbol &&
            (tx.type === "BUY" || tx.type === "SELL"),
        )
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )

      let shares = 0
      // Cost basis accumulated in USD — each transaction's cost is converted
      // to USD at today's rate on ingestion (good enough for a dashboard).
      let totalCostUsd = 0

      for (const tx of txs) {
        const txRate = rate(tx.account.currency)
        if (tx.type === "BUY") {
          totalCostUsd += (tx.quantity * tx.unitPrice + tx.fee) * txRate
          shares += tx.quantity
        } else {
          // Proportional reduction of the USD cost basis on sell
          const avgUsd = shares > 0 ? totalCostUsd / shares : 0
          totalCostUsd -= tx.quantity * avgUsd
          shares -= tx.quantity
        }
      }

      const history = priceHistoryMap.get(symbol) ?? []
      const lastRow = history.at(-1)
      const priceCurrency = lastRow?.currency ?? "USD"
      const latestClose = lastRow?.close ?? null
      const valueUsd =
        latestClose !== null ? shares * latestClose * rate(priceCurrency) : null
      const pnl = valueUsd !== null ? valueUsd - totalCostUsd : null
      const pnlPct =
        totalCostUsd > 0 && pnl !== null ? (pnl / totalCostUsd) * 100 : null

      return {
        symbol,
        name: nameMap.get(symbol) ?? null,
        shares,
        avgCostUsd: shares > 0 ? totalCostUsd / shares : 0,
        latestClose,
        priceCurrency,
        valueUsd,
        costBasisUsd: totalCostUsd,
        pnl,
        pnlPct,
        _priceIdx: idx,
      }
    })
    .filter((p) => p.shares > 0.00001)

  // ── Portfolio-level KPIs (all in USD internally) ────────────────────────────────
  const totalValueUsd = positions.reduce((acc, p) => acc + (p.valueUsd ?? 0), 0)
  const totalCostUsd = positions.reduce((acc, p) => acc + p.costBasisUsd, 0)
  const totalPnlUsd = totalValueUsd - totalCostUsd
  const totalPnlPct = totalCostUsd > 0 ? (totalPnlUsd / totalCostUsd) * 100 : 0

  const dividendTxs = allTransactions.filter((tx) => tx.type === "DIVIDEND")
  // Convert dividends to USD
  const totalDividendsUsd = dividendTxs.reduce(
    (acc, tx) =>
      acc + calcTransactionTotal(tx) * rate(tx.account.currency),
    0,
  )

  // ── Apply display currency conversion ───────────────────────────────────
  const d = (usdValue: number) => usdValue * displayRate

  const totalValue = d(totalValueUsd)
  const totalCost = d(totalCostUsd)
  const totalPnl = d(totalPnlUsd)
  const totalDividends = d(totalDividendsUsd)

  // ── Portfolio chart (FX-adjusted, all in USD, scaled to display currency) ───
  const txsForChart = allTransactions.map((tx) => ({
    ...tx,
    accountCurrency: tx.account.currency,
  }))
  const chartDataUsd = computeOverallChart(txsForChart, priceHistoryMap, fxRates)
  // Scale chart points to the display currency
  const chartData = chartDataUsd.map((pt) => ({
    ...pt,
    value: pt.value * displayRate,
    cost: pt.cost * displayRate,
  }))

  // ── Allocation data (display currency) ───────────────────────────────────
  const allocationData = [...positions]
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
    .map((p) => ({
      symbol: p.symbol,
      name: p.name,
      value: d(p.valueUsd ?? 0),
      pct: totalValueUsd > 0 ? ((p.valueUsd ?? 0) / totalValueUsd) * 100 : 0,
    }))

  // ── Dividend income by year (in display currency) ──────────────────────────
  const dividendsByYear: Record<string, number> = {}
  for (const tx of dividendTxs) {
    const year = new Date(tx.date).getUTCFullYear().toString()
    dividendsByYear[year] =
      (dividendsByYear[year] ?? 0) +
      calcTransactionTotal(tx) * rate(tx.account.currency) * displayRate
  }
  const dividendYearData = Object.entries(dividendsByYear)
    .map(([year, amount]) => ({ year, amount }))
    .sort((a, b) => a.year.localeCompare(b.year))

  // ── Recent transactions ───────────────────────────────────────────────
  const recentTxs = [...allTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  // ── Portfolio stats ───────────────────────────────────────────────────
  // Use reduce instead of spread (Math.min(...large_array) can blow the stack)
  const externalBuyTxs = allTransactions.filter((tx) => tx.type === "BUY" && !tx.isDrip)
  const firstBuyTs = externalBuyTxs.length > 0
    ? externalBuyTxs.reduce((min, tx) => {
      const t = new Date(tx.date).getTime()
      return t < min ? t : min
    }, Infinity)
    : null
  const grossPerformance = d(totalPnlUsd + totalDividendsUsd)
  
  // Calculate XIRR for Annualized Return
  const xirrCashFlows: CashFlow[] = []
  for (const tx of allTransactions) {
    const amountUsd = calcTransactionTotal(tx) * rate(tx.account.currency)
    if (tx.type === "BUY" && !tx.isDrip) {
      // Cash out of pocket into portfolio
      xirrCashFlows.push({ amount: -amountUsd, date: new Date(tx.date) })
    } else if (tx.type === "SELL") {
      // Cash out of portfolio into pocket
      xirrCashFlows.push({ amount: amountUsd, date: new Date(tx.date) })
    } else if (tx.type === "DIVIDEND" && !tx.isDrip) {
      // Cash dividend paid out to pocket
      xirrCashFlows.push({ amount: amountUsd, date: new Date(tx.date) })
    }
  }
  
  // Current portfolio value acts as a final withdrawal cash flow
  if (totalValueUsd > 0) {
    xirrCashFlows.push({ amount: totalValueUsd, date: new Date() })
  }
  
  const annualizedReturn = xirr(xirrCashFlows)

  const sortedPositions = [...positions].sort(
    (a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0),
  )

  const hasData = allTransactions.length > 0

  return (
    <Page>
      <SetHeader>
        <h1 className="text-base font-medium">Dashboard</h1>
      </SetHeader>
      {DISPLAY_CURRENCIES.length > 1 && (
        <SetActions>
          <Suspense>
            <CurrencyToggle
              currencies={DISPLAY_CURRENCIES}
              activeCurrency={displayCurrency}
            />
          </Suspense>
        </SetActions>
      )}

      {!hasData ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <WalletIcon className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No portfolio data yet</p>
            <p className="text-sm text-muted-foreground">
              Add an account and your first transactions to see your dashboard.
            </p>
          </div>
          <Link
            href="/accounts/new"
            className="text-sm text-primary hover:underline"
          >
            Create your first account →
          </Link>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ─────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Portfolio Value</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {formatCurrency(totalValue, displayCurrency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Across {positions.length} holding
                {positions.length !== 1 ? "s" : ""}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Unrealized P&amp;L</CardDescription>
                <CardTitle
                  className={`flex items-center gap-1 text-2xl tabular-nums ${totalPnl >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {totalPnl >= 0 ? (
                    <ArrowUpIcon className="size-5" />
                  ) : (
                    <ArrowDownIcon className="size-5" />
                  )}
                  {formatCurrency(Math.abs(totalPnl), displayCurrency)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className={`text-sm ${totalPnl >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                    }`}
                >
                  {totalPnlPct >= 0 ? "+" : ""}
                  {totalPnlPct.toFixed(2)}% vs cost basis
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Cost Basis</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {formatCurrency(totalCost, displayCurrency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Total invested capital
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Dividend Income</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-blue-600 dark:text-blue-400">
                  {formatCurrency(totalDividends, displayCurrency)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {dividendTxs.length} payment
                {dividendTxs.length !== 1 ? "s" : ""} all-time
              </CardContent>
            </Card>
          </div>

          {/* ── Portfolio Value Chart ─────────────────────────────── */}
          {chartData.length > 0 && (
            <PortfolioValueChart
              data={chartData}
              description="Weekly portfolio value vs cost basis"
              currency={displayCurrency}
            />
          )}

          {/* ── Allocation + Dividend Income ─────────────────────── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <AllocationChart data={allocationData} currency={displayCurrency} />
            <div className="flex flex-col gap-4">
              <DividendIncomeChart data={dividendYearData} currency={displayCurrency} />
              <PortfolioStatsCard
                firstInvestmentTs={firstBuyTs}
                investment={totalCost}
                grossPerformance={grossPerformance}
                netWorth={totalValue}
                annualizedReturn={annualizedReturn}
                currency={displayCurrency}
              />
            </div>
          </div>

          {/* ── Positions Table ───────────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Positions</CardTitle>
                <CardDescription>
                  Current holdings ranked by value
                </CardDescription>
              </div>
              <Link
                href="/holdings"
                className="text-sm text-muted-foreground hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Avg Cost</TableHead>
                    <TableHead className="text-right">Last Price</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">P&amp;L</TableHead>
                    <TableHead className="text-right">Alloc.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPositions.map((p) => (
                    <TableRow key={p.symbol}>
                      <TableCell>
                        <Link
                          href={`/symbol/${p.symbol}`}
                          className="hover:underline"
                        >
                          <span className="font-semibold">
                            {p.symbol.startsWith("TD:") ? p.name : p.symbol}
                          </span>
                          {!p.symbol.startsWith("TD:") && p.name && (
                            <span className="block text-xs text-muted-foreground">
                              {p.name}
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(p.shares)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(d(p.avgCostUsd), displayCurrency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.latestClose !== null ? (
                          formatCurrency(
                            p.latestClose * rate(p.priceCurrency) * displayRate,
                            displayCurrency,
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {p.valueUsd !== null ? (
                          formatCurrency(d(p.valueUsd), displayCurrency)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.pnl !== null ? (
                          <div
                            className={
                              p.pnl >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }
                          >
                            <span>
                              {p.pnl >= 0 ? "+" : ""}
                              {formatCurrency(d(p.pnl), displayCurrency)}
                            </span>
                            {p.pnlPct !== null && (
                              <span className="block text-xs">
                                {p.pnlPct >= 0 ? "+" : ""}
                                {p.pnlPct.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {totalValueUsd > 0 && p.valueUsd !== null
                          ? `${((p.valueUsd / totalValueUsd) * 100).toFixed(1)}%`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ── Recent Transactions ───────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Latest activity across all accounts
                </CardDescription>
              </div>
              <Link
                href="/holdings/all"
                className="text-sm text-muted-foreground hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTxs.map((tx) => {
                    const total = calcTransactionTotal(tx)
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(tx.date)}
                        </TableCell>
                        <TableCell>
                          <TransactionTypeBadge type={tx.type} isDrip={tx.isDrip} />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          <Link
                            href={`/symbol/${tx.symbol}`}
                            className="hover:underline"
                          >
                            {tx.symbol}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/accounts/${tx.account.id}`}
                            className="text-sm hover:underline"
                          >
                            {tx.account.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {tx.type === "SELL" ? (
                            <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400">
                              <MinusIcon className="size-3" />
                              {formatCurrency(total * rate(tx.account.currency) * displayRate, displayCurrency)}
                            </span>
                          ) : tx.type === "DIVIDEND" ? (
                            <span className="flex items-center justify-end gap-1 text-blue-600 dark:text-blue-400">
                              <PlusIcon className="size-3" />
                              {formatCurrency(total * rate(tx.account.currency) * displayRate, displayCurrency)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {formatCurrency(total * rate(tx.account.currency) * displayRate, displayCurrency)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </Page>
  )
}
