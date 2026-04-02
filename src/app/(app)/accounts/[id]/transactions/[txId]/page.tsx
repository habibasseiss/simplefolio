import { updateTransactionAction } from "@/actions/transaction.actions"
import { DeleteTransactionButton } from "@/components/delete-transaction-button"
import { Page, PageHeader, PageTitle } from "@/components/page"
import { TransactionForm } from "@/components/transaction-form"
import { Button } from "@/components/ui/button"
import type { Transaction } from "@/domain/transaction/transaction.types"
import { findAccountById } from "@/repositories/account.repository"
import { findTransactionById } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { ChevronLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string; txId: string }>
}) {
  const { id, txId } = await params
  const userId = await getDefaultUserId()

  const [account, transaction] = await Promise.all([
    findAccountById(id, userId),
    findTransactionById(txId, id),
  ])

  if (!account || !transaction) notFound()

  const action = updateTransactionAction.bind(null, id, txId)

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/accounts/${id}`}>
              <ChevronLeftIcon className="size-4" />
            </Link>
          </Button>
          <div>
            <PageTitle>Edit Transaction</PageTitle>
            <p className="text-sm text-muted-foreground">{account.name}</p>
          </div>
        </div>
        <DeleteTransactionButton accountId={id} txId={txId} />
      </PageHeader>
      <TransactionForm
        action={action}
        defaultValues={transaction as unknown as Partial<Transaction>}
        submitLabel="Save Changes"
      />
    </Page>
  )
}
