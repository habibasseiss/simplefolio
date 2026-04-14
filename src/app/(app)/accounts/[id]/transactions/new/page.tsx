import { createTesouroTransactionAction } from "@/actions/tesouro.actions"
import { createTransactionAction } from "@/actions/transaction.actions"
import { SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { TesouroBondTransactionForm } from "@/components/tesouro-transaction-form"
import { TransactionForm } from "@/components/transaction-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { findAccountById, findAccountsByUserId } from "@/repositories/account.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { notFound } from "next/navigation"

export default async function NewTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await getDefaultUserId()
  const [account, accounts] = await Promise.all([
    findAccountById(id, userId),
    findAccountsByUserId(userId)
  ])

  if (!account) notFound()

  const transactionAction = createTransactionAction.bind(null, id)
  const tesouroAction = createTesouroTransactionAction.bind(null, id)
  const nraTaxRate = process.env.NRA_TAX ? parseFloat(process.env.NRA_TAX) : null

  return (
    <Page>
      <SetHeader back={`/accounts/${id}`}>
        <h1 className="text-base font-medium">New Transaction</h1>
      </SetHeader>

      <div className="mx-auto w-full max-w-2xl">
        <Tabs defaultValue="stock" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stock">Stock / ETF</TabsTrigger>
            <TabsTrigger value="bond">Bond</TabsTrigger>
          </TabsList>
          <TabsContent value="stock" className="mt-4">
            <TransactionForm action={transactionAction} accounts={accounts} defaultAccountId={id} nraTaxRate={nraTaxRate} submitLabel="Add Transaction" />
          </TabsContent>
          <TabsContent value="bond" className="mt-4">
            <TesouroBondTransactionForm action={tesouroAction} accounts={accounts} defaultAccountId={id} submitLabel="Add Bond Transaction" />
          </TabsContent>
        </Tabs>
      </div>
    </Page>
  )
}
