import { describe, it, expect } from 'vitest';
import { xirr, type CashFlow } from '../finance/xirr';

/**
 * Helper: creates a Date from "YYYY-MM-DD".
 */
function d(iso: string): Date {
  return new Date(iso);
}

/**
 * Asserts that the XIRR result is within `tolerance` of the expected value.
 * Default tolerance is 0.005 (0.5 percentage point).
 */
function expectXirr(cashFlows: CashFlow[], expected: number, tolerance = 0.005) {
  const result = xirr(cashFlows);
  expect(result).not.toBeNull();
  expect(Math.abs(result! - expected)).toBeLessThanOrEqual(tolerance);
}

// ─── Edge Cases / Input Validation ─────────────────────────────────────────

describe('xirr – edge cases', () => {
  it('returns null for empty array', () => {
    expect(xirr([])).toBeNull();
  });

  it('returns null for a single cash flow', () => {
    expect(xirr([{ amount: -1000, date: d('2024-01-01') }])).toBeNull();
  });

  it('returns null when all cash flows are negative (only outflows)', () => {
    expect(
      xirr([
        { amount: -1000, date: d('2024-01-01') },
        { amount: -500, date: d('2024-06-01') },
      ]),
    ).toBeNull();
  });

  it('returns null when all cash flows are positive (only inflows)', () => {
    expect(
      xirr([
        { amount: 1000, date: d('2024-01-01') },
        { amount: 500, date: d('2024-06-01') },
      ]),
    ).toBeNull();
  });

  it('returns null when there are zero-amount cash flows only', () => {
    expect(
      xirr([
        { amount: 0, date: d('2024-01-01') },
        { amount: 0, date: d('2024-06-01') },
      ]),
    ).toBeNull();
  });
});

// ─── Trivial / Exact Cases ─────────────────────────────────────────────────

describe('xirr – trivial scenarios', () => {
  it('returns ~0% when you get back exactly what you invested after 1 year', () => {
    const cfs: CashFlow[] = [
      { amount: -1000, date: d('2024-01-01') },
      { amount: 1000, date: d('2025-01-01') },
    ];
    expectXirr(cfs, 0.0, 0.001);
  });

  it('returns ~100% for doubling your money in one year', () => {
    const cfs: CashFlow[] = [
      { amount: -1000, date: d('2024-01-01') },
      { amount: 2000, date: d('2025-01-01') },
    ];
    // Tolerance widened: 365 calendar days ≠ 365.25-day "year" used by XIRR
    expectXirr(cfs, 1.0, 0.005);
  });

  it('returns ~-50% for losing half your money in one year', () => {
    const cfs: CashFlow[] = [
      { amount: -1000, date: d('2024-01-01') },
      { amount: 500, date: d('2025-01-01') },
    ];
    // Tolerance widened: 365 calendar days ≠ 365.25-day "year" used by XIRR
    expectXirr(cfs, -0.5, 0.005);
  });
});

// ─── Classic XIRR Scenarios (verified against Excel/Google Sheets) ─────────

describe('xirr – classic known-answer tests', () => {
  it('matches the Excel XIRR example (irregular cash flows)', () => {
    // Classic XIRR textbook example
    const cfs: CashFlow[] = [
      { amount: -10000, date: d('2008-01-01') },
      { amount: 2750, date: d('2008-03-01') },
      { amount: 4250, date: d('2008-10-30') },
      { amount: 3250, date: d('2009-02-15') },
      { amount: 2750, date: d('2009-04-01') },
    ];
    // Excel XIRR gives ~0.3734 (37.34%)
    expectXirr(cfs, 0.3734, 0.005);
  });

  it('handles a simple 10% annual return over 2 years', () => {
    // Invest $1000, after 2 years receive $1000 * 1.1^2 = $1210
    const cfs: CashFlow[] = [
      { amount: -1000, date: d('2023-01-01') },
      { amount: 1210, date: d('2025-01-01') },
    ];
    expectXirr(cfs, 0.10, 0.001);
  });

  it('handles a simple 10% annual return over 5 years', () => {
    // $1000 * 1.1^5 = $1610.51
    const cfs: CashFlow[] = [
      { amount: -1000, date: d('2020-01-01') },
      { amount: 1610.51, date: d('2025-01-01') },
    ];
    expectXirr(cfs, 0.10, 0.001);
  });

  it('handles a negative return scenario over 3 years', () => {
    // $1000 * 0.95^3 = $857.375
    const cfs: CashFlow[] = [
      { amount: -1000, date: d('2022-01-01') },
      { amount: 857.375, date: d('2025-01-01') },
    ];
    expectXirr(cfs, -0.05, 0.001);
  });
});

// ─── Portfolio Management Scenarios ────────────────────────────────────────

describe('xirr – portfolio management scenarios', () => {
  it('single buy + current valuation (basic long position)', () => {
    // Buy $10,000 of stock on Jan 1 2023, now worth $12,500 on Jan 1 2025 (2 years)
    // Expected CAGR: (12500/10000)^(1/2) - 1 ≈ 11.80%
    const cfs: CashFlow[] = [
      { amount: -10000, date: d('2023-01-01') },
      { amount: 12500, date: d('2025-01-01') },
    ];
    expectXirr(cfs, 0.1180, 0.005);
  });

  it('multiple buys (DCA) + current valuation', () => {
    // Monthly DCA of $1,000 for 6 months, portfolio now worth $6,450
    const cfs: CashFlow[] = [
      { amount: -1000, date: d('2024-01-01') },
      { amount: -1000, date: d('2024-02-01') },
      { amount: -1000, date: d('2024-03-01') },
      { amount: -1000, date: d('2024-04-01') },
      { amount: -1000, date: d('2024-05-01') },
      { amount: -1000, date: d('2024-06-01') },
      { amount: 6450, date: d('2024-12-31') },
    ];
    // With DCA the money-weighted return is higher than a simple
    // (6450/6000 - 1) because earlier contributions had more time
    const result = xirr(cfs);
    expect(result).not.toBeNull();
    // Result should be positive and reasonable
    expect(result!).toBeGreaterThan(0.05);
    expect(result!).toBeLessThan(0.30);
  });

  it('buy, receive dividends, current valuation', () => {
    // Buy $10,000. Receive $200 dividends. Portfolio still worth $10,000.
    // Effective return comes entirely from income.
    const cfs: CashFlow[] = [
      { amount: -10000, date: d('2024-01-01') },
      { amount: 200, date: d('2024-07-01') },  // mid-year dividend
      { amount: 10000, date: d('2025-01-01') }, // terminal value (price unchanged)
    ];
    const result = xirr(cfs);
    expect(result).not.toBeNull();
    // ~2% return from dividends alone
    expect(result!).toBeCloseTo(0.02, 1);
  });

  it('buy, partial sell at profit, remaining valuation', () => {
    // Buy $10,000. Sell half at 20% profit ($6,000). Remaining worth $6,000.
    const cfs: CashFlow[] = [
      { amount: -10000, date: d('2023-01-01') },
      { amount: 6000, date: d('2024-01-01') },  // sell half for $6,000 (was $5,000 cost)
      { amount: 6000, date: d('2025-01-01') },  // remaining half also worth $6,000
    ];
    // Total received: $12,000 on a $10,000 investment
    const result = xirr(cfs);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThan(0.05);
    expect(result!).toBeLessThan(0.15);
  });

  it('buy, full sell at a loss', () => {
    // Buy $10,000, sell for $8,000 after 1 year — 20% loss
    const cfs: CashFlow[] = [
      { amount: -10000, date: d('2024-01-01') },
      { amount: 8000, date: d('2025-01-01') },
    ];
    expectXirr(cfs, -0.20, 0.001);
  });

  it('multiple buys and sells with dividends (realistic portfolio)', () => {
    // Simulate a real portfolio lifecycle:
    // Jan 2023: Buy $5,000
    // Apr 2023: Buy $3,000 more
    // Jul 2023: Receive $80 dividend
    // Oct 2023: Sell $2,000 worth
    // Jan 2024: Receive $90 dividend
    // Jul 2024: Buy $4,000 more
    // Jan 2025: Portfolio worth $12,500
    const cfs: CashFlow[] = [
      { amount: -5000, date: d('2023-01-15') },
      { amount: -3000, date: d('2023-04-10') },
      { amount: 80, date: d('2023-07-15') },
      { amount: 2000, date: d('2023-10-20') },
      { amount: 90, date: d('2024-01-15') },
      { amount: -4000, date: d('2024-07-01') },
      { amount: 12500, date: d('2025-01-15') },
    ];
    const result = xirr(cfs);
    expect(result).not.toBeNull();
    // Net invested: 5000+3000+4000=12000, got back: 80+2000+90+12500=14670
    // Annualized over 2 years, expect a moderate positive return
    expect(result!).toBeGreaterThan(0.0);
    expect(result!).toBeLessThan(0.50);
  });

  it('DRIP scenario: only external cash flows matter', () => {
    // Simulates what the dashboard does: exclude DRIPs.
    // Buy $10,000. Dividends are reinvested (DRIP = excluded).
    // Terminal value is $11,000 (includes reinvested dividends in price).
    // Only the initial buy and terminal value are cash flows.
    const cfs: CashFlow[] = [
      { amount: -10000, date: d('2024-01-01') },
      { amount: 11000, date: d('2025-01-01') },
    ];
    expectXirr(cfs, 0.10, 0.001);
  });
});

// ─── Time-Sensitivity Tests ────────────────────────────────────────────────

describe('xirr – time sensitivity', () => {
  it('returns a higher annualized rate for the same absolute gain in less time', () => {
    // Same $1000 gain, but in 6 months vs 2 years
    const shortTerm: CashFlow[] = [
      { amount: -10000, date: d('2024-07-01') },
      { amount: 11000, date: d('2025-01-01') }, // ~6 months
    ];
    const longTerm: CashFlow[] = [
      { amount: -10000, date: d('2023-01-01') },
      { amount: 11000, date: d('2025-01-01') }, // 2 years
    ];
    const shortResult = xirr(shortTerm)!;
    const longResult = xirr(longTerm)!;
    // Short-term should have a much higher annualized rate
    expect(shortResult).toBeGreaterThan(longResult * 1.5);
  });

  it('handles very short time horizon (a few days)', () => {
    // Buy Monday, worth 1% more by Friday (5 days)
    const cfs: CashFlow[] = [
      { amount: -10000, date: d('2024-06-03') },
      { amount: 10100, date: d('2024-06-08') }, // 5 days later
    ];
    const result = xirr(cfs);
    expect(result).not.toBeNull();
    // 1% in 5 days annualized should be very high
    expect(result!).toBeGreaterThan(1.0); // >100% annualized
  });

  it('handles a multi-year investment (10 years)', () => {
    // $10,000 compounding at 8% for 10 years = $10,000 * 1.08^10 ≈ $21,589.25
    const cfs: CashFlow[] = [
      { amount: -10000, date: d('2015-01-01') },
      { amount: 21589.25, date: d('2025-01-01') },
    ];
    expectXirr(cfs, 0.08, 0.001);
  });
});

// ─── Same-Day Consolidation ────────────────────────────────────────────────

describe('xirr – same-day cash flow consolidation', () => {
  it('consolidates multiple cash flows on the same date', () => {
    // Two buys on the same day should behave the same as one combined buy
    const separate: CashFlow[] = [
      { amount: -5000, date: d('2024-01-01') },
      { amount: -5000, date: d('2024-01-01') },
      { amount: 11000, date: d('2025-01-01') },
    ];
    const combined: CashFlow[] = [
      { amount: -10000, date: d('2024-01-01') },
      { amount: 11000, date: d('2025-01-01') },
    ];
    const separateResult = xirr(separate)!;
    const combinedResult = xirr(combined)!;
    expect(separateResult).toBeCloseTo(combinedResult, 4);
  });

  it('handles buy and dividend on the same day', () => {
    // Net cash flow on day 1: -10000 + 50 = -9950
    const cfs: CashFlow[] = [
      { amount: -10000, date: d('2024-01-01') },
      { amount: 50, date: d('2024-01-01') },     // ex-div day purchase
      { amount: 10500, date: d('2025-01-01') },
    ];
    const result = xirr(cfs);
    expect(result).not.toBeNull();
    // (~10500/9950 - 1 ≈ 5.5%)
    expect(result!).toBeGreaterThan(0.04);
    expect(result!).toBeLessThan(0.07);
  });
});

// ─── Stress / Robustness ───────────────────────────────────────────────────

describe('xirr – robustness', () => {
  it('handles a near-total-loss scenario', () => {
    // Invest $10,000, now worth $100 after a year (99% loss)
    const cfs: CashFlow[] = [
      { amount: -10000, date: d('2024-01-01') },
      { amount: 100, date: d('2025-01-01') },
    ];
    const result = xirr(cfs);
    expect(result).not.toBeNull();
    expect(result!).toBeCloseTo(-0.99, 1);
  });

  it('handles an extremely high return', () => {
    // 10x return in one year (e.g., meme stock)
    const cfs: CashFlow[] = [
      { amount: -1000, date: d('2024-01-01') },
      { amount: 10000, date: d('2025-01-01') },
    ];
    const result = xirr(cfs);
    expect(result).not.toBeNull();
    // 900% return
    expect(result!).toBeCloseTo(9.0, 0);
  });

  it('handles many small periodic investments (monthly DCA for 2 years)', () => {
    const cfs: CashFlow[] = [];
    // 24 monthly investments of $500
    for (let m = 0; m < 24; m++) {
      const year = 2023 + Math.floor(m / 12);
      const month = (m % 12) + 1;
      cfs.push({
        amount: -500,
        date: new Date(year, month - 1, 1),
      });
    }
    // Terminal value: total invested $12,000, portfolio worth $13,200 (10% total gain)
    cfs.push({ amount: 13200, date: new Date(2025, 0, 1) });

    const result = xirr(cfs);
    expect(result).not.toBeNull();
    // The money-weighted return should be positive
    expect(result!).toBeGreaterThan(0.0);
    // And less than the naive 10% because later investments had less time
    expect(result!).toBeLessThan(0.20);
  });

  it('handles unsorted cash flows (should sort internally)', () => {
    // Provide cash flows in reverse order — the function should still work
    const cfs: CashFlow[] = [
      { amount: 1100, date: d('2025-01-01') },
      { amount: -1000, date: d('2024-01-01') },
    ];
    expectXirr(cfs, 0.10, 0.001);
  });

  it('converges for a scenario with mixed large and small cash flows', () => {
    const cfs: CashFlow[] = [
      { amount: -100000, date: d('2022-01-01') },
      { amount: 5, date: d('2022-06-01') },       // tiny dividend
      { amount: 8, date: d('2022-12-01') },       // tiny dividend
      { amount: -50000, date: d('2023-01-01') },
      { amount: 12, date: d('2023-06-01') },      // tiny dividend
      { amount: 175000, date: d('2025-01-01') },  // terminal value
    ];
    const result = xirr(cfs);
    expect(result).not.toBeNull();
    // Net invested: $150,000 over 3 years, got ~$175,025
    expect(result!).toBeGreaterThan(0.0);
    expect(result!).toBeLessThan(0.15);
  });
});

// ─── Regression: matches the dashboard's cash-flow construction ────────────

describe('xirr – dashboard integration parity', () => {
  it('correctly models the dashboard cash-flow convention (buys negative, sells/divs/terminal positive)', () => {
    // Simulates exactly what dashboard/page.tsx builds:
    //   BUY  (non-DRIP) → negative (cash leaves wallet)
    //   SELL            → positive (cash enters wallet)
    //   DIVIDEND (non-DRIP) → positive (cash enters wallet)
    //   terminal value  → positive (hypothetical liquidation)
    //
    // Scenario:
    //   2023-01-01: BUY  $10,000 (includes $10 fee in total)
    //   2023-07-01: DIV  $150 (net after 15% NRA tax)
    //   2024-01-01: SELL $4,000 (net of $5 fee)
    //   2024-07-01: DIV  $100
    //   2025-01-01: terminal value $7,500
    const cfs: CashFlow[] = [
      { amount: -10010, date: d('2023-01-01') },  // BUY: qty*price + fee
      { amount: 150, date: d('2023-07-01') },     // DIVIDEND: net after withholding
      { amount: 3995, date: d('2024-01-01') },    // SELL: qty*price - fee
      { amount: 100, date: d('2024-07-01') },     // DIVIDEND
      { amount: 7500, date: d('2025-01-01') },    // terminal portfolio value
    ];
    const result = xirr(cfs);
    expect(result).not.toBeNull();
    // Total cash out: 10010
    // Total cash in: 150 + 3995 + 100 + 7500 = 11745
    // Profit: $1735 over 2 years → moderate positive return
    expect(result!).toBeGreaterThan(0.05);
    expect(result!).toBeLessThan(0.15);
  });

  it('returns null gracefully when portfolio has no terminal value and no sells', () => {
    // Edge: all buys, no sells, no dividends, portfolio value is 0
    // This means all cash flows are negative → should return null
    const cfs: CashFlow[] = [
      { amount: -5000, date: d('2024-01-01') },
      { amount: -3000, date: d('2024-06-01') },
    ];
    expect(xirr(cfs)).toBeNull();
  });
});
