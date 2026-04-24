import { AccountFavicon } from "@/components/account-favicon"
import { SetActions, SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { findAccountsByUserId } from "@/repositories/account.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { PencilIcon, PlusIcon, WalletIcon } from "lucide-react"
import Link from "next/link"

export default async function AccountsPage() {
  const userId = await getDefaultUserId()
  const accounts = await findAccountsByUserId(userId)

  return (
    <Page>
      <SetHeader>
        <h1 className="text-base font-medium">Accounts</h1>
      </SetHeader>
      <SetActions>
        <Button asChild size="sm">
          <Link href="/accounts/new">
            <PlusIcon className="size-4" />
            New Account
          </Link>
        </Button>
      </SetActions>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <WalletIcon className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No accounts yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first account to get started.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/accounts/new">
              <PlusIcon className="size-4" />
              New Account
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="relative h-full transition-colors hover:bg-muted/50">
              <Link href={`/accounts/${account.id}`} className="absolute inset-0" aria-label={account.name} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className='flex flex-row items-center gap-2'>
                    {account.website && (
                      <AccountFavicon website={account.website} size={20} className="rounded-sm shrink-0" />
                    )}
                    <span className="flex flex-row items-baseline gap-2">
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <Badge variant="secondary">{account.currency}</Badge>
                    </span>
                  </span>
                  <Button variant="ghost" size="icon" className="relative z-10" asChild>
                    <Link href={`/accounts/${account.id}/edit`}>
                      <PencilIcon className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {account._count.transactions}{" "}
                  {account._count.transactions === 1
                    ? "transaction"
                    : "transactions"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Page>
  )
}

