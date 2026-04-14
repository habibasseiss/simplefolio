import { updateTesouroTransactionAction } from "@/actions/tesouro.actions"
import { DeleteTransactionButton } from "@/components/delete-transaction-button"
import { SetActions, SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { TesouroBondTransactionForm } from "@/components/tesouro-transaction-form"
import { findAccountsByUserId } from "@/repositories/account.repository"
import { findTransactionById } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { notFound } from "next/navigation"

export default async function EditTesouroBondTransactionPage({
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

  const action = updateTesouroTransactionAction.bind(null, txId)

  return (
    <Page>
      <SetHeader back={`/accounts/${transaction.account.id}`}>
        <div>
          <h1 className="text-base font-medium">Edit Bond Transaction</h1>
          <p className="text-xs text-muted-foreground">{transaction.account.name}</p>
        </div>
      </SetHeader>
      <SetActions>
        <DeleteTransactionButton txId={txId} />
      </SetActions>
      <div className="mx-auto w-full max-w-md">
        <TesouroBondTransactionForm
          action={action}
          accounts={accounts}
          defaultAccountId={transaction.account.id}
          defaultValues={{
            symbol: transaction.symbol,
            type: transaction.type as "BUY" | "SELL",
            date: transaction.date,
            quantity: transaction.quantity,
            unitPrice: transaction.unitPrice,
            purchaseRate: transaction.purchaseRate,
            fee: transaction.fee,
            notes: transaction.notes,
          }}
          submitLabel="Save Changes"
        />
      </div>
    </Page>
  )
}
