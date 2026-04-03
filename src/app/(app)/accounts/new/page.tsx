import { createAccountAction } from "@/actions/account.actions"
import { AccountForm } from "@/components/account-form"
import { SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"

export default function NewAccountPage() {
  return (
    <Page>
      <SetHeader back="/accounts">
        <h1 className="text-base font-medium">New Account</h1>
      </SetHeader>
      <AccountForm action={createAccountAction} submitLabel="Create Account" />
    </Page>
  )
}
