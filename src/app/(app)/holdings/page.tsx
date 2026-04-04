import { SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { findAllSymbols } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { ArrowRightIcon, LayersIcon, TrendingUpIcon } from "lucide-react"
import Link from "next/link"

export default async function HoldingsPage() {
  const userId = await getDefaultUserId()
  const symbols = await findAllSymbols(userId)

  return (
    <Page>
      <SetHeader>
        <h1 className="text-base font-medium">Holdings</h1>
      </SetHeader>

      {symbols.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <TrendingUpIcon className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No holdings yet</p>
            <p className="text-sm text-muted-foreground">
              Add buy transactions to an account to see your holdings here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/holdings/all">
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayersIcon className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base">All Holdings</CardTitle>
                  </div>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          </Link>
          {symbols.map((symbol) => (
            <Link key={symbol} href={`/symbol/${symbol}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{symbol}</CardTitle>
                    <ArrowRightIcon className="size-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Page>
  )
}
