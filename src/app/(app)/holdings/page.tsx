import { SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { findAllSymbols } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { ArrowRightIcon, TrendingUpIcon } from "lucide-react"
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
          {symbols.map((symbol) => (
            <Link key={symbol} href={`/symbol/${symbol}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{symbol}</CardTitle>
                    <ArrowRightIcon className="size-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                {/* <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {symbol}
                  </p>
                </CardContent> */}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Page>
  )
}
