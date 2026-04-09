import { AccountTypeFilter } from "@/components/account-type-filter"
import { CurrencyToggle } from "@/components/currency-toggle"
import { SetActions, SetHeader } from "@/components/header-context"
import { ImportAllDividendsButton } from "@/components/import-all-dividends-button"
import { Page } from "@/components/page"
import { PortfolioValueChart } from "@/components/portfolio-value-chart"
import { SymbolDateFilter } from "@/components/symbol-date-filter"
import { SyncTesouroButton } from "@/components/sync-tesouro-button"
import { TransactionTypeBadge } from "@/components/transaction-type-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { isTesouroBond } from "@/domain/tesouro/tesouro.utils"
import { calcTransactionTotal } from "@/domain/transaction/transaction.utils"
import { DISPLAY_CURRENCIES, resolveDisplayCurrency } from "@/lib/display-currencies"
import { formatCurrency, formatDate, formatNumber } from "@/lib/format"
import { getExchangeRate, getRatesTo } from "@/lib/fx"
import { computeOverallChart } from "@/lib/portfolio"
import { findPriceHistory } from "@/repositories/price-history.repository"
import { findAllSymbols, findAllTransactionsForUser } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { MinusIcon, PlusIcon, TrendingUpIcon } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"

export default async function AllHoldingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; category?: string; currency?: string }>
}) {
  const { from, to, category: rawCategory, currency: rawCurrency } = await searchParams

  const displayCurrency = resolveDisplayCurrency(rawCurrency)

  const VALID_CATEGORIES = ["stocks", "bonds"] as const
  type AssetCategory = (typeof VALID_CATEGORIES)[number]
  const activeCategory = rawCategory
    ? rawCategory.split(",").filter((c): c is AssetCategory => (VALID_CATEGORIES as readonly string[]).includes(c))
    : null
  const userId = await getDefaultUserId()
  const [allTransactions, symbols] = await Promise.all([
    findAllTransactionsForUser(userId),
    findAllSymbols(userId),
  ])

  // Fetch price history for every symbol in the portfolio
  const priceHistories = await Promise.all(symbols.map((s) => findPriceHistory(s)))
  const priceHistoryMap = new Map(symbols.map((s, i) => [s, priceHistories[i]]))

  // FX rates cached 24 h — convert all price + account currencies to USD
  const priceCurrencies = symbols.map((s) => priceHistoryMap.get(s)?.at(-1)?.currency ?? "USD")
  const accountCurrencies = allTransactions.map((tx) => tx.account.currency)
  const fxRates = await getRatesTo([...priceCurrencies, ...accountCurrencies], "USD")

  // Display FX rate: USD → selected display currency
  const displayRate = await getExchangeRate("USD", displayCurrency)

  const fromDate = from ? new Date(from + "T00:00:00") : null
  const toDate = to ? new Date(to + "T23:59:59.999") : null

  const isCategoryMatch = (symbol: string) => {
    if (!activeCategory || activeCategory.length === 0) return true
    const isbond = isTesouroBond(symbol)
    if (isbond && !activeCategory.includes("bonds")) return false
    if (!isbond && !activeCategory.includes("stocks")) return false
    return true
  }

  const txsWithCurrency = allTransactions
    .filter((tx) => isCategoryMatch(tx.symbol))
    .map((tx) => ({
      ...tx,
      accountCurrency: tx.account.currency,
    }))

  const transactions = allTransactions.filter((tx) => {
    if (!isCategoryMatch(tx.symbol)) return false
    const d = new Date(tx.date)
    if (fromDate && d < fromDate) return false
    if (toDate && d > toDate) return false
    return true
  })

  const dividendTransactions = transactions.filter((tx) => tx.type === "DIVIDEND")
  const totalDividendNet = dividendTransactions.reduce(
    (acc, tx) =>
      acc + calcTransactionTotal(tx) * (fxRates.get(tx.account.currency) ?? 1) * displayRate,
    0,
  )
  const totalDividendGross = dividendTransactions.reduce(
    (acc, tx) =>
      acc + tx.quantity * tx.unitPrice * (fxRates.get(tx.account.currency) ?? 1) * displayRate,
    0,
  )
  const totalDividendTaxPaid = dividendTransactions.reduce(
    (acc, tx) =>
      acc +
      tx.quantity * tx.unitPrice * (tx.nraTax ?? 0) * (fxRates.get(tx.account.currency) ?? 1) * displayRate,
    0,
  )
  const hasDividendTax = totalDividendTaxPaid > 0

  // Filter price history rows to the selected period before charting.
  // Transactions stay unfiltered so share counts at each week are correct.
  const filteredPriceHistoryMap = new Map(
    [...priceHistoryMap.entries()].map(([symbol, rows]) => [
      symbol,
      rows.filter((row) => {
        if (fromDate && row.date < fromDate) return false
        if (toDate && row.date > toDate) return false
        return true
      }),
    ]),
  )
  const overallChartData = computeOverallChart(txsWithCurrency, filteredPriceHistoryMap, fxRates)
  const chartData = overallChartData.map((pt) => ({
    ...pt,
    value: pt.value * displayRate,
    cost: pt.cost * displayRate,
  }))

  return (
    <Page>
      <SetHeader back="/holdings">
        <h1 className="text-base font-medium">All Holdings</h1>
      </SetHeader>
      <SetActions>
        <Suspense>
          <SymbolDateFilter from={from} to={to} />
        </Suspense>
        <Suspense>
          <AccountTypeFilter activeTypes={null} activeCategory={activeCategory} />
        </Suspense>
        {DISPLAY_CURRENCIES.length > 1 && (
          <Suspense>
            <CurrencyToggle currencies={DISPLAY_CURRENCIES} activeCurrency={displayCurrency} />
          </Suspense>
        )}
        <SyncTesouroButton />
        <ImportAllDividendsButton />
      </SetActions>

      {dividendTransactions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Dividends Received</CardDescription>
              <CardTitle className="text-2xl text-blue-600 dark:text-blue-400">
                {formatCurrency(totalDividendNet, displayCurrency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {hasDividendTax ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Gross {formatCurrency(totalDividendGross, displayCurrency)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tax withheld {formatCurrency(totalDividendTaxPaid, displayCurrency)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {dividendTransactions.length} payment
                  {dividendTransactions.length !== 1 ? "s" : ""}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {overallChartData.length > 0 && (
        <PortfolioValueChart
          data={chartData}
          description="Weekly total portfolio value vs cost basis"
          currency={displayCurrency}
        />
      )}

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <TrendingUpIcon className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {fromDate || toDate
                ? "No transactions in this period"
                : "No transactions yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {fromDate || toDate
                ? "Try adjusting the date range."
                : "Transactions will appear here once added."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const total = calcTransactionTotal(tx)
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell>
                      <TransactionTypeBadge type={tx.type} isDrip={tx.isDrip} />
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      <Link href={`/symbol/${tx.symbol}`} className="hover:underline">
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
                    <TableCell className="text-right">
                      {formatNumber(tx.quantity)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(tx.unitPrice, tx.account.currency)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {tx.fee > 0
                        ? formatCurrency(tx.fee, tx.account.currency)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {tx.type === "SELL" ? (
                        <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400">
                          <MinusIcon className="size-3" />
                          {formatCurrency(total, tx.account.currency)}
                        </span>
                      ) : tx.type === "DIVIDEND" ? (
                        <span className="flex items-center justify-end gap-1 text-blue-400 dark:text-blue-600">
                          <PlusIcon className="size-3" />
                          {formatCurrency(total, tx.account.currency)}
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-blue-600 dark:text-blue-400">
                          <PlusIcon className="size-3" />
                          {formatCurrency(total, tx.account.currency)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  )
}
