import { updateTransactionAction } from "@/actions/transaction.actions"
import { DeleteTransactionButton } from "@/components/delete-transaction-button"
import { SetActions, SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { TransactionForm } from "@/components/transaction-form"
import type { Transaction } from "@/domain/transaction/transaction.types"
import { findAccountsByUserId } from "@/repositories/account.repository"
import { findTransactionById } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { notFound } from "next/navigation"

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ txId: string }>
}) {
  const { txId } = await params
  const userId = await getDefaultUserId()

  const [transaction, accounts] = await Promise.all([
    findTransactionById(txId, userId),
    findAccountsByUserId(userId),
  ])

  if (!transaction) notFound()

  const action = updateTransactionAction.bind(null, txId)
  const nraTaxRate = process.env.NRA_TAX ? parseFloat(process.env.NRA_TAX) : null

  return (
    <Page>
      <SetHeader back={`/accounts/${transaction.account.id}`}>
        <div>
          <h1 className="text-base font-medium">Edit Transaction</h1>
          <p className="text-xs text-muted-foreground">{transaction.account.name}</p>
        </div>
      </SetHeader>
      <SetActions>
        <DeleteTransactionButton txId={txId} />
      </SetActions>
      <div className="mx-auto w-full max-w-md">
        <TransactionForm
          action={action}
          defaultValues={transaction as unknown as Partial<Transaction>}
          accounts={accounts}
          defaultAccountId={transaction.account.id}
          nraTaxRate={nraTaxRate}
          submitLabel="Save Changes"
        />
      </div>
    </Page>
  )
}
