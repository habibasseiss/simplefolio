import { describe, expect, it } from "vitest"

import {
  buildFireMilestones,
  buildFireProjection,
  buildSpendingPower,
  buildWithdrawalProjection,
  buildWithdrawalTable,
  calculateFireSummary,
  classifyAllocationBuckets,
  getWithdrawalStrategy,
} from "@/domain/fire/fire.utils"

const assumptions = {
  annualExpenses: 50000,
  monthlySavings: 3800,
  expectedReturnPct: 7,
  inflationPct: 3,
  currentAge: 35,
  withdrawalRatePct: 4,
}

describe("calculateFireSummary", () => {
  it("calculates FIRE target, progress, annual withdrawal, and estimated year", () => {
    expect(calculateFireSummary(487200, assumptions, 2000)).toMatchObject({
      fireNumber: 1250000,
      progressPct: 38.976,
      safeAnnualWithdrawal: 50000,
      estimatedFireYear: 2008,
    })
  })

  it("keeps the FIRE number on Rule of 25 while applying the selected withdrawal rate", () => {
    expect(
      calculateFireSummary(
        487200,
        {
          ...assumptions,
          withdrawalRatePct: 3,
        },
        2000,
      ),
    ).toMatchObject({
      fireNumber: 1250000,
      safeAnnualWithdrawal: 37500,
    })
  })

  it("returns zero progress for an invalid FIRE target", () => {
    const result = calculateFireSummary(
      100000,
      {
        ...assumptions,
        annualExpenses: 0,
      },
      2000,
    )

    expect(result.progressPct).toBe(0)
    expect(result.yearsToFire).toBeNull()
  })
})

describe("buildFireProjection", () => {
  it("builds annual bear/base/bull trajectories with contributions", () => {
    const points = buildFireProjection(100000, assumptions, 2, 2026)

    expect(points).toEqual([
      { year: 2026, bear: 100000, base: 100000, bull: 100000, fireTarget: 1250000 },
      { year: 2027, bear: 150600, base: 152600, bull: 154600, fireTarget: 1250000 },
      { year: 2028, bear: 203730, base: 208882, bull: 214114, fireTarget: 1250000 },
    ])
  })
})

describe("buildFireMilestones", () => {
  it("marks completed, active, and future milestones", () => {
    const milestones = buildFireMilestones(800000, assumptions, 2026)

    expect(milestones.map((m) => [m.name, m.status])).toEqual([
      ["Coast FIRE", "done"],
      ["Lean FIRE", "done"],
      ["Full FIRE", "active"],
      ["Fat FIRE", "future"],
    ])
  })

  it("sets the Coast FIRE target at 4.6x annual expenses", () => {
    expect(buildFireMilestones(0, assumptions, 2026)[0]).toMatchObject({
      name: "Coast FIRE",
      target: 230000,
    })
  })
})

describe("withdrawal helpers", () => {
  it("returns strategy metadata", () => {
    expect(getWithdrawalStrategy("classic")).toMatchObject({
      name: "classic",
      ratePct: 4,
      riskPct: 30,
      riskLabel: "Low Risk",
    })
  })

  it("builds withdrawal projection with inflation-adjusted withdrawals", () => {
    const points = buildWithdrawalProjection(1250000, 4, 3, 2, 2033)

    expect(points).toEqual([
      { year: 2033, bear: 1250000, base: 1250000, bull: 1250000 },
      { year: 2034, bear: 1262500, base: 1287500, bull: 1312500 },
      { year: 2035, bear: 1274125, base: 1326125, bull: 1379125 },
    ])
  })

  it("builds spending power data", () => {
    expect(buildSpendingPower(50000, 3, 3, 2033)).toEqual([
      { year: 2033, nominal: 50000, real: 50000 },
      { year: 2034, nominal: 51500, real: 50000 },
      { year: 2035, nominal: 53045, real: 50000 },
    ])
  })

  it("builds withdrawal table rows for the requested years", () => {
    const rows = buildWithdrawalTable(1250000, 50000, 7, 3, 2, 2033, 41)

    expect(rows).toEqual([
      {
        year: 2033,
        age: 41,
        portfolioStart: 1250000,
        withdrawal: 50000,
        growth: 87500,
        portfolioEnd: 1287500,
        status: "growing",
      },
      {
        year: 2034,
        age: 42,
        portfolioStart: 1287500,
        withdrawal: 51500,
        growth: 90125,
        portfolioEnd: 1326125,
        status: "growing",
      },
    ])
  })
})

describe("classifyAllocationBuckets", () => {
  it("groups holdings into Boglehead-style buckets", () => {
    const buckets = classifyAllocationBuckets([
      { symbol: "VTI", instrumentType: "EQUITY", value: 600 },
      { symbol: "VXUS", instrumentType: "EQUITY", value: 300 },
      { symbol: "BND", instrumentType: "EQUITY", value: 100 },
      { symbol: "AAPL", instrumentType: "EQUITY", value: 50 },
    ])

    expect(buckets.map(({ key, label, value }) => ({ key, label, value }))).toEqual([
      { key: "us", label: "US Total Market", value: 600 },
      { key: "international", label: "International Stocks", value: 300 },
      { key: "bonds", label: "Bonds", value: 100 },
      { key: "other", label: "Other Holdings", value: 50 },
    ])
    expect(buckets[0].pct).toBeCloseTo(57.14285714285714)
    expect(buckets[1].pct).toBeCloseTo(28.57142857142857)
    expect(buckets[2].pct).toBeCloseTo(9.523809523809524)
    expect(buckets[3].pct).toBeCloseTo(4.761904761904762)
  })
})
