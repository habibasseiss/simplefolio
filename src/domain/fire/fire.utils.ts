import type {
  AllocationBucket,
  FireAssumptions,
  FireMilestone,
  FireProjectionPoint,
  SpendingPowerPoint,
  WithdrawalProjectionPoint,
  WithdrawalStrategyName,
  WithdrawalTableRow,
} from "@/domain/fire/fire.types"

const SCENARIO_RETURNS = {
  bear: 0.05,
  base: 0.07,
  bull: 0.09,
} as const

const WITHDRAWAL_STRATEGIES = {
  conservative: {
    name: "conservative",
    title: "Conservative",
    ratePct: 3,
    riskPct: 8,
    riskLabel: "Very Low Risk",
    description: "For 50+ year retirements and larger safety margins.",
  },
  classic: {
    name: "classic",
    title: "Classic 4% Rule",
    ratePct: 4,
    riskPct: 30,
    riskLabel: "Low Risk",
    description: "Trinity Study benchmark for a 30-year retirement.",
  },
  flexible: {
    name: "flexible",
    title: "Flexible Dynamic",
    ratePct: 4.5,
    riskPct: 55,
    riskLabel: "Moderate Risk",
    description: "Adjusts spending based on portfolio performance.",
  },
} as const

const US_TOTAL_MARKET = new Set(["VTI", "VOO", "SPY", "ITOT", "SCHB", "SPLG"])
const INTERNATIONAL = new Set(["VXUS", "IXUS", "VEA", "VWO", "SCHF", "SPEM"])
const BOND_FUNDS = new Set(["BND", "AGG", "BNDX", "IEF", "TLT"])

type FireSummary = {
  fireNumber: number
  safeAnnualWithdrawal: number
  progressPct: number
  yearsToFire: number | null
  estimatedFireYear: number | null
}

type HoldingForAllocation = {
  symbol: string
  instrumentType: string
  value: number
}

function roundMoney(value: number): number {
  return Math.round(value)
}

function pct(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0
}

export function calculateFireSummary(
  currentPortfolio: number,
  assumptions: FireAssumptions,
  startYear: number,
): FireSummary {
  const ruleOf25FireNumber = roundMoney(assumptions.annualExpenses * 25)
  const selectedRateAnnualWithdrawal = roundMoney(
    ruleOf25FireNumber * (assumptions.withdrawalRatePct / 100),
  )
  const yearsToFire = estimateYearsToTarget(
    currentPortfolio,
    assumptions.monthlySavings,
    assumptions.expectedReturnPct / 100,
    ruleOf25FireNumber,
  )

  return {
    fireNumber: ruleOf25FireNumber,
    safeAnnualWithdrawal: selectedRateAnnualWithdrawal,
    progressPct: pct(currentPortfolio, ruleOf25FireNumber),
    yearsToFire,
    estimatedFireYear: yearsToFire === null ? null : startYear + Math.ceil(yearsToFire),
  }
}

export function estimateYearsToTarget(
  currentPortfolio: number,
  monthlySavings: number,
  annualReturn: number,
  target: number,
): number | null {
  if (target <= 0) return null
  if (currentPortfolio >= target) return 0
  if (monthlySavings <= 0 && annualReturn <= 0) return null

  let portfolio = currentPortfolio
  for (let month = 1; month <= 100 * 12; month++) {
    portfolio = portfolio * (1 + annualReturn / 12) + monthlySavings
    if (portfolio >= target) return month / 12
  }

  return null
}

export function buildFireProjection(
  currentPortfolio: number,
  assumptions: FireAssumptions,
  years: number,
  startYear: number,
): FireProjectionPoint[] {
  const fireTarget = roundMoney(assumptions.annualExpenses * 25)
  const annualContribution = assumptions.monthlySavings * 12
  let bear = currentPortfolio
  let base = currentPortfolio
  let bull = currentPortfolio

  return Array.from({ length: years + 1 }, (_, index) => {
    const point = {
      year: startYear + index,
      bear: roundMoney(bear),
      base: roundMoney(base),
      bull: roundMoney(bull),
      fireTarget,
    }

    bear = bear * (1 + SCENARIO_RETURNS.bear) + annualContribution
    base = base * (1 + SCENARIO_RETURNS.base) + annualContribution
    bull = bull * (1 + SCENARIO_RETURNS.bull) + annualContribution

    return point
  })
}

export function buildFireMilestones(
  currentPortfolio: number,
  assumptions: FireAssumptions,
  startYear: number,
): FireMilestone[] {
  const definitions = [
    {
      name: "Coast FIRE" as const,
      multiplier: 4.6,
      description: "Portfolio can coast toward retirement with fewer contributions.",
    },
    {
      name: "Lean FIRE" as const,
      multiplier: 15,
      description: "Minimal lifestyle retirement target.",
    },
    {
      name: "Full FIRE" as const,
      multiplier: 25,
      description: "Classic 25x annual expenses target.",
    },
    {
      name: "Fat FIRE" as const,
      multiplier: 33,
      description: "Larger lifestyle and lower withdrawal-rate target.",
    },
  ]

  const withTargets = definitions.map((definition) => {
    const target = roundMoney(assumptions.annualExpenses * definition.multiplier)

    return {
      ...definition,
      target,
      estimatedYear: estimateTargetYear(currentPortfolio, assumptions, target, startYear),
      progressPct: pct(currentPortfolio, target),
    }
  })
  const firstUnreachedIndex = withTargets.findIndex(
    (milestone) => currentPortfolio < milestone.target,
  )

  return withTargets.map((milestone, index) => ({
    name: milestone.name,
    description: milestone.description,
    target: milestone.target,
    estimatedYear: milestone.estimatedYear,
    progressPct: milestone.progressPct,
    status:
      currentPortfolio >= milestone.target
        ? "done"
        : index === firstUnreachedIndex
          ? "active"
          : "future",
  }))
}

function estimateTargetYear(
  currentPortfolio: number,
  assumptions: FireAssumptions,
  target: number,
  startYear: number,
): number | null {
  const years = estimateYearsToTarget(
    currentPortfolio,
    assumptions.monthlySavings,
    assumptions.expectedReturnPct / 100,
    target,
  )

  return years === null ? null : startYear + Math.ceil(years)
}

export function getWithdrawalStrategy(name: WithdrawalStrategyName) {
  return WITHDRAWAL_STRATEGIES[name]
}

export function buildWithdrawalProjection(
  startPortfolio: number,
  withdrawalRatePct: number,
  inflationPct: number,
  years: number,
  startYear: number,
): WithdrawalProjectionPoint[] {
  const baseWithdrawal = startPortfolio * (withdrawalRatePct / 100)
  const inflation = inflationPct / 100
  let bear = startPortfolio
  let base = startPortfolio
  let bull = startPortfolio

  return Array.from({ length: years + 1 }, (_, index) => {
    const point = {
      year: startYear + index,
      bear: Math.max(0, roundMoney(bear)),
      base: Math.max(0, roundMoney(base)),
      bull: Math.max(0, roundMoney(bull)),
    }
    const withdrawal = baseWithdrawal * Math.pow(1 + inflation, index)

    bear = bear * (1 + SCENARIO_RETURNS.bear) - withdrawal
    base = base * (1 + SCENARIO_RETURNS.base) - withdrawal
    bull = bull * (1 + SCENARIO_RETURNS.bull) - withdrawal

    return point
  })
}

export function buildSpendingPower(
  annualWithdrawal: number,
  inflationPct: number,
  years: number,
  startYear: number,
): SpendingPowerPoint[] {
  const inflation = inflationPct / 100

  return Array.from({ length: years }, (_, index) => ({
    year: startYear + index,
    nominal: roundMoney(annualWithdrawal * Math.pow(1 + inflation, index)),
    real: roundMoney(annualWithdrawal),
  }))
}

export function buildWithdrawalTable(
  startPortfolio: number,
  annualWithdrawal: number,
  returnPct: number,
  inflationPct: number,
  years: number,
  startYear: number,
  startAge = 0,
): WithdrawalTableRow[] {
  let portfolio = startPortfolio
  const returnRate = returnPct / 100
  const inflation = inflationPct / 100

  return Array.from({ length: years }, (_, index) => {
    const portfolioStart = roundMoney(portfolio)
    const withdrawal = roundMoney(annualWithdrawal * Math.pow(1 + inflation, index))
    const growth = roundMoney(portfolio * returnRate)
    const portfolioEnd = roundMoney(portfolio + growth - withdrawal)
    portfolio = portfolioEnd

    return {
      year: startYear + index,
      age: startAge + index,
      portfolioStart,
      withdrawal,
      growth,
      portfolioEnd,
      status: portfolioEnd > portfolioStart ? "growing" : "declining",
    }
  })
}

export function classifyAllocationBuckets(
  holdings: HoldingForAllocation[],
): AllocationBucket[] {
  const totals = {
    us: 0,
    international: 0,
    bonds: 0,
    other: 0,
  }

  for (const holding of holdings) {
    const symbol = holding.symbol.toUpperCase()

    if (US_TOTAL_MARKET.has(symbol)) {
      totals.us += holding.value
    } else if (INTERNATIONAL.has(symbol)) {
      totals.international += holding.value
    } else if (holding.instrumentType === "BOND" || BOND_FUNDS.has(symbol)) {
      totals.bonds += holding.value
    } else {
      totals.other += holding.value
    }
  }

  const total = totals.us + totals.international + totals.bonds + totals.other

  return [
    {
      key: "us" as const,
      label: "US Total Market",
      value: totals.us,
      pct: pct(totals.us, total),
    },
    {
      key: "international" as const,
      label: "International Stocks",
      value: totals.international,
      pct: pct(totals.international, total),
    },
    {
      key: "bonds" as const,
      label: "Bonds",
      value: totals.bonds,
      pct: pct(totals.bonds, total),
    },
    {
      key: "other" as const,
      label: "Other Holdings",
      value: totals.other,
      pct: pct(totals.other, total),
    },
  ].filter((bucket) => bucket.value > 0)
}
