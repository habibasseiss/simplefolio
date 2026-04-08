import { AccountTypeFilter } from "@/components/account-type-filter"
import { SetActions, SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { PortfolioValueChart } from "@/components/portfolio-value-chart"
import { TransactionTypeBadge } from '@/components/transaction-type-badge'
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { calcTransactionTotal } from "@/domain/transaction/transaction.utils"
import { formatCurrency, formatDate } from '@/lib/format'
import { computeAccountChart } from "@/lib/portfolio"
import { findAccountById } from "@/repositories/account.repository"
import { findPriceHistory } from "@/repositories/price-history.repository"
import { findTransactionsByAccountId } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import {
  DollarSignIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

const VALID_TYPES = ["BUY", "SELL", "DIVIDEND"] as const
type TxType = (typeof VALID_TYPES)[number]

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ types?: string }>
}) {
  const { id } = await params
  const { types: rawTypes } = await searchParams
  const userId = await getDefaultUserId()

  const activeTypes = rawTypes
    ? (rawTypes.split(",").filter((t): t is TxType => (VALID_TYPES as readonly string[]).includes(t)))
    : null

  const [account, allTransactions] = await Promise.all([
    findAccountById(id, userId),
    findTransactionsByAccountId(id),
  ])

  if (!account) notFound()

  // Fetch price history for each symbol in this account
  const symbols = [...new Set(allTransactions.filter((tx) => tx.type === "BUY" || tx.type === "SELL").map((tx) => tx.symbol))]
  const priceHistories = await Promise.all(symbols.map((s) => findPriceHistory(s)))
  const priceHistoryMap = new Map(symbols.map((s, i) => [s, priceHistories[i]]))
  const accountChartData = computeAccountChart(allTransactions, priceHistoryMap)

  const transactions =
    activeTypes && activeTypes.length > 0
      ? allTransactions.filter((tx) => activeTypes.includes(tx.type as TxType))
      : allTransactions

  return (
    <Page>
      <SetHeader back="/accounts">
        <div>
          <h1 className="text-base font-medium">{account.name}</h1>
          <p className="text-xs text-muted-foreground">{account.currency}</p>
        </div>
      </SetHeader>
      <SetActions>
        <Suspense>
          <AccountTypeFilter activeTypes={activeTypes} />
        </Suspense>
        <Button asChild>
          <Link href={`/accounts/${id}/transactions/new`}>
            <PlusIcon className="size-4" />
            Add Transaction
          </Link>
        </Button>
      </SetActions>

      {accountChartData.length > 0 && (
        <PortfolioValueChart
          data={accountChartData}
          description="Weekly account value vs cost basis"
          currency={account.currency}
        />
      )}

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <DollarSignIcon className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first transaction to this account.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={`/accounts/${id}/transactions/new`}>
              <PlusIcon className="size-4" />
              Add Transaction
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-10" />
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
                    <TableCell className="font-mono font-medium">
                      <Link
                        href={`/symbol/${tx.symbol}`}
                        className="hover:underline"
                      >
                        {tx.symbol}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{tx.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(tx.unitPrice, account.currency)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {tx.fee > 0
                        ? formatCurrency(tx.fee, account.currency)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {tx.type === "SELL" ? (
                        <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400">
                          <MinusIcon className="size-3" />
                          {formatCurrency(total, account.currency)}
                        </span>
                      ) : tx.type === "DIVIDEND" ? (
                        <span className="flex items-center justify-end gap-1 text-gray-400 dark:text-gray-600">
                          {formatCurrency(total, account.currency)}
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-blue-600 dark:text-blue-400">
                          <PlusIcon className="size-3" />
                          {formatCurrency(total, account.currency)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          href={`/accounts/${id}/transactions/${tx.id}`}
                          aria-label="Edit transaction"
                        >
                          <PencilIcon className="size-3.5" />
                        </Link>
                      </Button>
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
