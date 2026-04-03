import { updateTransactionAction } from "@/actions/transaction.actions"
import { DeleteTransactionButton } from "@/components/delete-transaction-button"
import { SetActions, SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { TransactionForm } from "@/components/transaction-form"
import type { Transaction } from "@/domain/transaction/transaction.types"
import { findAccountById } from "@/repositories/account.repository"
import { findTransactionById } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
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
  const nraTaxRate = process.env.NRA_TAX ? parseFloat(process.env.NRA_TAX) : null

  return (
    <Page>
      <SetHeader back={`/accounts/${id}`}>
        <div>
          <h1 className="text-base font-medium">Edit Transaction</h1>
          <p className="text-xs text-muted-foreground">{account.name}</p>
        </div>
      </SetHeader>
      <SetActions>
        <DeleteTransactionButton accountId={id} txId={txId} />
      </SetActions>
      <TransactionForm
        action={action}
        defaultValues={transaction as unknown as Partial<Transaction>}
        nraTaxRate={nraTaxRate}
        submitLabel="Save Changes"
      />
    </Page>
  )
}
