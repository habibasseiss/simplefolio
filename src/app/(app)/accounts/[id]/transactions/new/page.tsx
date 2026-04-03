import { createTransactionAction } from "@/actions/transaction.actions"
import { SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { TransactionForm } from "@/components/transaction-form"
import { findAccountById } from "@/repositories/account.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { notFound } from "next/navigation"

export default async function NewTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await getDefaultUserId()
  const account = await findAccountById(id, userId)

  if (!account) notFound()

  const action = createTransactionAction.bind(null, id)
  const nraTaxRate = process.env.NRA_TAX ? parseFloat(process.env.NRA_TAX) : null

  return (
    <Page>
      <SetHeader back={`/accounts/${id}`}>
        <div>
          <h1 className="text-base font-medium">New Transaction</h1>
          <p className="text-xs text-muted-foreground">{account.name}</p>
        </div>
      </SetHeader>
      <TransactionForm action={action} nraTaxRate={nraTaxRate} submitLabel="Add Transaction" />
    </Page>
  )
}
