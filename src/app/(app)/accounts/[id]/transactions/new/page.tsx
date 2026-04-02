import { createTransactionAction } from "@/actions/transaction.actions"
import { Page, PageHeader, PageTitle } from "@/components/page"
import { TransactionForm } from "@/components/transaction-form"
import { Button } from "@/components/ui/button"
import { findAccountById } from "@/repositories/account.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { ChevronLeftIcon } from "lucide-react"
import Link from "next/link"
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
      <PageHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/accounts/${id}`}>
              <ChevronLeftIcon className="size-4" />
            </Link>
          </Button>
          <div>
            <PageTitle>New Transaction</PageTitle>
            <p className="text-sm text-muted-foreground">{account.name}</p>
          </div>
        </div>
      </PageHeader>
      <TransactionForm action={action} nraTaxRate={nraTaxRate} submitLabel="Add Transaction" />
    </Page>
  )
}
