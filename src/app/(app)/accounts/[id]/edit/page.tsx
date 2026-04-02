import { updateAccountAction } from "@/actions/account.actions"
import { AccountForm } from "@/components/account-form"
import { Page, PageHeader, PageTitle } from "@/components/page"
import { Button } from "@/components/ui/button"
import { findAccountById } from "@/repositories/account.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { ChevronLeftIcon } from "lucide-react"
import Link from "next/link"
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
      <PageHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/accounts/${id}`}>
              <ChevronLeftIcon className="size-4" />
            </Link>
          </Button>
          <PageTitle>Edit Account</PageTitle>
        </div>
      </PageHeader>
      <AccountForm
        action={action}
        defaultValues={{ id: account.id, name: account.name, currency: account.currency }}
        submitLabel="Save Changes"
      />
    </Page>
  )
}
