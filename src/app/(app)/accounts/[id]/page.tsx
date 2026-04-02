import { Page, PageHeader, PageTitle } from "@/components/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { TransactionType } from "@/domain/transaction/transaction.types"
import { findAccountById } from "@/repositories/account.repository"
import { findTransactionsByAccountId } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  DollarSignIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

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

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value
  )
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await getDefaultUserId()

  const [account, transactions] = await Promise.all([
    findAccountById(id, userId),
    findTransactionsByAccountId(id),
  ])

  if (!account) notFound()

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
            <PageTitle>{account.name}</PageTitle>
            <p className="text-sm text-muted-foreground">{account.currency}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/accounts/${id}/edit`}>
              <PencilIcon className="size-4" />
              Edit
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/accounts/${id}/transactions/new`}>
              <PlusIcon className="size-4" />
              Add Transaction
            </Link>
          </Button>
        </div>
      </PageHeader>

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
                const total = tx.quantity * tx.unitPrice + tx.fee
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
                        <span className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                          <ArrowUpIcon className="size-3" />
                          {formatCurrency(total, account.currency)}
                        </span>
                      ) : tx.type === "DIVIDEND" ? (
                        <span className="flex items-center justify-end gap-1 text-blue-600 dark:text-blue-400">
                          {formatCurrency(total, account.currency)}
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400">
                          <ArrowDownIcon className="size-3" />
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
