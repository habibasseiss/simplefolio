import { SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { Card } from '@/components/ui/card'
import { findSymbolsByTickers } from "@/repositories/symbol.repository"
import { findAllSymbols } from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"
import { ArrowRightIcon, LandmarkIcon, LayersIcon, TrendingUpIcon } from "lucide-react"
import Link from "next/link"

export default async function HoldingsPage() {
  const userId = await getDefaultUserId()
  const symbols = await findAllSymbols(userId)
  const symbolRows = await findSymbolsByTickers(symbols)
  const symbolNameMap = new Map(symbolRows.map((s) => [s.ticker, s.name]))

  const bonds = symbols.filter((s) => s.startsWith("TD:"))
  const stocks = symbols.filter((s) => !s.startsWith("TD:"))

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
        <div className="space-y-8">
          <section>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/holdings/all">
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between gap-2 px-4">
                    <div className="flex items-center gap-2">
                      <LayersIcon className="size-4 text-muted-foreground" />
                      <span className="text-base font-semibold">All Holdings</span>
                    </div>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
              {stocks.map((symbol) => (
                <Link key={symbol} href={`/symbol/${symbol}`}>
                  <Card className="h-full transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-2 px-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold">{symbol}</p>
                        {symbolNameMap.get(symbol) && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {symbolNameMap.get(symbol)}
                          </p>
                        )}
                      </div>
                      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {bonds.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <LandmarkIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-medium text-muted-foreground">Tesouro Direto</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bonds.map((symbol) => {
                  const name = symbolNameMap.get(symbol)
                  return (
                    <Link key={symbol} href={`/symbol/${symbol}`}>
                      <Card className="h-full transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-2 px-4">
                          <p className="min-w-0 flex-1 truncate text-base font-semibold">{name ?? symbol}</p>
                          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
                        </div>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </Page>
  )
}
