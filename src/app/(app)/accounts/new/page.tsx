import { createAccountAction } from "@/actions/account.actions"
import { AccountForm } from "@/components/account-form"
import { Page, PageHeader, PageTitle } from "@/components/page"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon } from "lucide-react"
import Link from "next/link"

export default function NewAccountPage() {
  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/accounts">
              <ChevronLeftIcon className="size-4" />
            </Link>
          </Button>
          <PageTitle>New Account</PageTitle>
        </div>
      </PageHeader>
      <AccountForm action={createAccountAction} submitLabel="Create Account" />
    </Page>
  )
}
