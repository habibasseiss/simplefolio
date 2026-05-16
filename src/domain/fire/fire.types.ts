export type FireScenarioName = "bear" | "base" | "bull"

export type WithdrawalStrategyName =
  | "conservative"
  | "classic"
  | "flexible"

export interface FireAssumptions {
  annualExpenses: number
  monthlySavings: number
  expectedReturnPct: number
  inflationPct: number
  currentAge: number
  withdrawalRatePct: number
}

export interface FireProjectionPoint {
  year: number
  bear: number
  base: number
  bull: number
  fireTarget: number
}

export interface FireMilestone {
  name: "Coast FIRE" | "Lean FIRE" | "Full FIRE" | "Fat FIRE"
  description: string
  target: number
  status: "done" | "active" | "future"
  estimatedYear: number | null
  progressPct: number
}

export interface WithdrawalProjectionPoint {
  year: number
  bear: number
  base: number
  bull: number
}

export interface SpendingPowerPoint {
  year: number
  nominal: number
  real: number
}

export interface WithdrawalTableRow {
  year: number
  age: number
  portfolioStart: number
  withdrawal: number
  growth: number
  portfolioEnd: number
  status: "growing" | "declining"
}

export interface AllocationBucket {
  key: "us" | "international" | "bonds" | "other"
  label: string
  value: number
  pct: number
}
