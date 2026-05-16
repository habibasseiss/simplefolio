import { Suspense } from "react"

import { CurrencyToggle } from "@/components/currency-toggle"
import { FirePlanner } from "@/components/fire/fire-planner"
import { SetActions, SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { calcTransactionTotal } from "@/domain/transaction/transaction.utils"
import { classifyAllocationBuckets } from "@/domain/fire/fire.utils"
import { DISPLAY_CURRENCIES, resolveDisplayCurrency } from "@/lib/display-currencies"
import { getExchangeRate, getRatesTo } from "@/lib/fx"
import { findPriceHistory } from "@/repositories/price-history.repository"
import {
  findAllSymbols,
  findAllTransactionsForUser,
} from "@/repositories/transaction.repository"
import { getDefaultUserId } from "@/repositories/user.repository"

export default async function FirePage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string }>
}) {
  const { currency: rawCurrency } = await searchParams
  const displayCurrency = resolveDisplayCurrency(rawCurrency)
  const userId = await getDefaultUserId()

  const [allTransactions, symbols] = await Promise.all([
    findAllTransactionsForUser(userId),
    findAllSymbols(userId),
  ])

  const priceHistories = await Promise.all(
    symbols.map((symbol) =>
      findPriceHistory(symbol.symbol, symbol.instrumentProvider),
    ),
  )
  const priceHistoryMap = new Map(
    symbols.map((symbol, index) => [symbol.symbol, priceHistories[index]]),
  )
  const priceCurrencies = symbols.map(
    (symbol) => priceHistoryMap.get(symbol.symbol)?.at(-1)?.currency ?? "USD",
  )
  const accountCurrencies = allTransactions.map((tx) => tx.account.currency)
  const fxRates = await getRatesTo(
    [...priceCurrencies, ...accountCurrencies],
    "USD",
  )
  const displayRate = await getExchangeRate("USD", displayCurrency)
  const rate = (currency: string) => fxRates.get(currency) ?? 1

  const positions = symbols
    .map((symbol) => {
      const txs = allTransactions
        .filter(
          (tx) =>
            tx.symbol === symbol.symbol &&
            (tx.type === "BUY" || tx.type === "SELL"),
        )
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      let shares = 0
      for (const tx of txs) {
        if (tx.type === "BUY") shares += tx.quantity
        if (tx.type === "SELL") shares -= tx.quantity
      }

      const lastRow = priceHistoryMap.get(symbol.symbol)?.at(-1)
      const latestClose = lastRow?.close ?? 0
      const priceCurrency = lastRow?.currency ?? "USD"
      const value = shares * latestClose * rate(priceCurrency) * displayRate

      return {
        symbol: symbol.symbol,
        instrumentType: symbol.instrumentType,
        shares,
        value,
      }
    })
    .filter((position) => position.shares > 0.00001)

  const currentPortfolio = positions.reduce(
    (sum, position) => sum + position.value,
    0,
  )
  const allocationBuckets = classifyAllocationBuckets(positions)
  const monthlySavingsUsd = calculateAverageMonthlySavings(
    allTransactions.map((tx) => ({
      type: tx.type,
      isDrip: tx.isDrip,
      date: tx.date,
      total: calcTransactionTotal(tx) * rate(tx.account.currency),
    })),
  )
  const currentYear = new Date().getFullYear()

  return (
    <Page>
      <SetHeader>
        <h1 className="text-base font-medium">FIRE Predictor</h1>
      </SetHeader>
      {DISPLAY_CURRENCIES.length > 1 && (
        <SetActions>
          <Suspense>
            <CurrencyToggle
              currencies={DISPLAY_CURRENCIES}
              activeCurrency={displayCurrency}
            />
          </Suspense>
        </SetActions>
      )}

      <FirePlanner
        currency={displayCurrency}
        currentPortfolio={currentPortfolio}
        currentYear={currentYear}
        displayRate={displayRate}
        allocationBuckets={allocationBuckets}
        initialAssumptions={{
          annualExpenses: 50000,
          monthlySavings: monthlySavingsUsd,
          expectedReturnPct: 7,
          inflationPct: 3,
          currentAge: 35,
          withdrawalRatePct: 4,
        }}
      />
    </Page>
  )
}

function calculateAverageMonthlySavings(
  transactions: Array<{
    type: string
    isDrip: boolean
    date: Date
    total: number
  }>,
) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  const externalBuys = transactions.filter(
    (tx) => tx.type === "BUY" && !tx.isDrip && tx.date >= start,
  )
  const total = externalBuys.reduce((sum, tx) => sum + tx.total, 0)

  return total > 0 ? Math.round(total / 12) : 3800
}
