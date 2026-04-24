import { updateAccountAction } from "@/actions/account.actions"
import { AccountForm } from "@/components/account-form"
import { SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { findAccountById } from "@/repositories/account.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { notFound } from "next/navigation"

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await getDefaultUserId()
  const account = await findAccountById(id, userId)

  if (!account) notFound()

  const action = updateAccountAction.bind(null, id)

  return (
    <Page>
      <SetHeader back={`/accounts`}>
        <h1 className="text-base font-medium">Edit Account</h1>
      </SetHeader>
      <AccountForm
        action={action}
        defaultValues={{ id: account.id, name: account.name, currency: account.currency, website: account.website }}
        submitLabel="Save Changes"
      />
    </Page>
  )
}
