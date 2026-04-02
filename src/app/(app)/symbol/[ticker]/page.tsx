import { ImportDividendsButton } from "@/components/import-dividends-button"
import { Page, PageHeader, PageTitle } from "@/components/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import type { TransactionType } from "@/domain/transaction/transaction.types"
import { calcTransactionTotal } from "@/domain/transaction/transaction.utils"
import { getFinanceProvider } from "@/lib/finance"
import { findTransactionsBySymbol } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  TrendingUpIcon,
} from "lucide-react"
import Link from "next/link"

function TransactionTypeBadge({ type }: { type: string }) {
  const variants: Record<
    TransactionType,
    { label: string; variant: "default" | "destructive" | "secondary" }
  > = {
    BUY: { label: "Buy", variant: "default" },
    SELL: { label: "Sell", variant: "destructive" },
    DIVIDEND: { label: "Dividend", variant: "secondary" },
  }
  const config = variants[type as TransactionType] ?? {
    label: type,
    variant: "secondary" as const,
  }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value,
  )
}

function formatNumber(value: number, decimals = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export default async function SymbolPage({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  const { ticker } = await params
  const symbol = decodeURIComponent(ticker).toUpperCase()
  const userId = await getDefaultUserId()

  const [transactions, quote] = await Promise.all([
    findTransactionsBySymbol(userId, symbol),
    getFinanceProvider()
      .getGlobalQuote(symbol)
      .catch(() => null),
  ])

  const totalShares = transactions.reduce((acc, tx) => {
    if (tx.type === "BUY") return acc + tx.quantity
    if (tx.type === "SELL") return acc - tx.quantity
    return acc
  }, 0)

  const totalCost = transactions.reduce((acc, tx) => {
    if (tx.type === "BUY") return acc + calcTransactionTotal(tx)
    if (tx.type === "SELL") return acc - calcTransactionTotal(tx)
    return acc
  }, 0)

  const averageCost = totalShares > 0 ? totalCost / totalShares : null
  const currentValue = quote ? totalShares * quote.price : null
  const unrealizedPnl =
    currentValue !== null && averageCost !== null
      ? currentValue - totalShares * averageCost
      : null

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/accounts">
              <ChevronLeftIcon className="size-4" />
            </Link>
          </Button>
          <div>
            <PageTitle>{symbol}</PageTitle>
            {quote && (
              <p className="text-sm text-muted-foreground">
                {quote.latestTradingDay}
              </p>
            )}
          </div>
        </div>
        <ImportDividendsButton symbol={symbol} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quote ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Current Price</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(quote.price)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className={
                    quote.change >= 0
                      ? "flex items-center gap-1 text-sm text-green-600 dark:text-green-400"
                      : "flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
                  }
                >
                  {quote.change >= 0 ? (
                    <ArrowUpIcon className="size-3" />
                  ) : (
                    <ArrowDownIcon className="size-3" />
                  )}
                  {formatCurrency(Math.abs(quote.change))} (
                  {formatNumber(Math.abs(quote.changePercent))}%)
                </span>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="col-span-3">
            <CardHeader>
              <CardDescription>Market data unavailable</CardDescription>
              <CardContent className="px-0 text-sm text-muted-foreground">
                Could not fetch current quote for {symbol}. Check your API key
                or try again later.
              </CardContent>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Shares Held</CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(totalShares)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {averageCost !== null && (
              <p className="text-sm text-muted-foreground">
                Avg. cost: {formatCurrency(averageCost)}
              </p>
            )}
          </CardContent>
        </Card>

        {currentValue !== null && unrealizedPnl !== null && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Market Value</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(currentValue)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Cost basis: {formatCurrency(totalCost)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Unrealized P&L</CardDescription>
                <CardTitle
                  className={
                    unrealizedPnl >= 0
                      ? "text-2xl text-green-600 dark:text-green-400"
                      : "text-2xl text-red-600 dark:text-red-400"
                  }
                >
                  {unrealizedPnl >= 0 ? "+" : ""}
                  {formatCurrency(unrealizedPnl)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span
                  className={
                    unrealizedPnl >= 0
                      ? "text-sm text-green-600 dark:text-green-400"
                      : "text-sm text-red-600 dark:text-red-400"
                  }
                >
                  {unrealizedPnl >= 0 ? "+" : ""}
                  {totalCost > 0
                    ? formatNumber((unrealizedPnl / totalCost) * 100)
                    : "0.00"}
                  %
                </span>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <TrendingUpIcon className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No transactions for {symbol}</p>
            <p className="text-sm text-muted-foreground">
              Transactions with this symbol will appear here.
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
                      <TransactionTypeBadge type={tx.type} />
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
                        <span className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                          <ArrowUpIcon className="size-3" />
                          {formatCurrency(total, tx.account.currency)}
                        </span>
                      ) : tx.type === "DIVIDEND" ? (
                        <span className="flex items-center justify-end gap-1 text-blue-600 dark:text-blue-400">
                          {formatCurrency(total, tx.account.currency)}
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400">
                          <ArrowDownIcon className="size-3" />
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
