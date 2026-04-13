import { describe, it, expect } from "vitest";
import {
  buildXirrCashFlows,
  type TransactionForCashFlow,
} from "../finance/cashflows";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Shorthand to build a minimal transaction for testing. */
function tx(
  overrides: Partial<TransactionForCashFlow> & Pick<TransactionForCashFlow, "type">,
): TransactionForCashFlow {
  return {
    date: new Date("2024-06-15"),
    quantity: 10,
    unitPrice: 100,
    fee: 0,
    nraTax: null,
    isDrip: false,
    account: { currency: "USD" },
    ...overrides,
  };
}

/** Identity FX rate – everything is already in USD. */
const usdRate = () => 1;

/** Fixed date to use as `asOf` so tests are deterministic. */
const asOf = new Date("2025-01-01");

// ─── Cash-flow sign convention ─────────────────────────────────────────────

describe("buildXirrCashFlows – sign conventions", () => {
  it("BUY produces a negative cash flow (money leaves wallet)", () => {
    const cfs = buildXirrCashFlows([tx({ type: "BUY" })], usdRate, 0, asOf);
    expect(cfs).toHaveLength(1);
    expect(cfs[0].amount).toBeLessThan(0);
  });

  it("SELL produces a positive cash flow (money enters wallet)", () => {
    const cfs = buildXirrCashFlows([tx({ type: "SELL" })], usdRate, 0, asOf);
    expect(cfs).toHaveLength(1);
    expect(cfs[0].amount).toBeGreaterThan(0);
  });

  it("DIVIDEND produces a positive cash flow (income received)", () => {
    const cfs = buildXirrCashFlows(
      [tx({ type: "DIVIDEND" })],
      usdRate,
      0,
      asOf,
    );
    expect(cfs).toHaveLength(1);
    expect(cfs[0].amount).toBeGreaterThan(0);
  });
});

// ─── Amount correctness ────────────────────────────────────────────────────

describe("buildXirrCashFlows – amounts", () => {
  it("BUY amount = quantity * unitPrice + fee (total cost)", () => {
    const cfs = buildXirrCashFlows(
      [tx({ type: "BUY", quantity: 10, unitPrice: 150, fee: 9.99 })],
      usdRate,
      0,
      asOf,
    );
    // calcTransactionTotal for BUY: 10 * 150 + 9.99 = 1509.99
    expect(cfs[0].amount).toBeCloseTo(-1509.99, 2);
  });

  it("SELL amount = quantity * unitPrice - fee (net proceeds)", () => {
    const cfs = buildXirrCashFlows(
      [tx({ type: "SELL", quantity: 5, unitPrice: 200, fee: 4.95 })],
      usdRate,
      0,
      asOf,
    );
    // calcTransactionTotal for SELL: 5 * 200 - 4.95 = 995.05
    expect(cfs[0].amount).toBeCloseTo(995.05, 2);
  });

  it("DIVIDEND amount = quantity * unitPrice * (1 - nraTax)", () => {
    const cfs = buildXirrCashFlows(
      [
        tx({
          type: "DIVIDEND",
          quantity: 100,
          unitPrice: 0.5,
          fee: 0,
          nraTax: 0.15,
        }),
      ],
      usdRate,
      0,
      asOf,
    );
    // calcTransactionTotal for DIVIDEND: 100 * 0.5 * (1 - 0.15) = 42.5
    expect(cfs[0].amount).toBeCloseTo(42.5, 2);
  });

  it("DIVIDEND without nraTax uses full gross amount", () => {
    const cfs = buildXirrCashFlows(
      [tx({ type: "DIVIDEND", quantity: 100, unitPrice: 0.5, fee: 0 })],
      usdRate,
      0,
      asOf,
    );
    // 100 * 0.5 * (1 - 0) = 50
    expect(cfs[0].amount).toBeCloseTo(50, 2);
  });
});

// ─── DRIP exclusion ────────────────────────────────────────────────────────

describe("buildXirrCashFlows – DRIP handling", () => {
  it("excludes DRIP BUY transactions (no external cash flow)", () => {
    const cfs = buildXirrCashFlows(
      [tx({ type: "BUY", isDrip: true })],
      usdRate,
      0,
      asOf,
    );
    // Only terminal value (0) would be added, but since it's 0 it's skipped too
    expect(cfs).toHaveLength(0);
  });

  it("excludes DRIP DIVIDEND transactions (reinvested, no cash to wallet)", () => {
    const cfs = buildXirrCashFlows(
      [tx({ type: "DIVIDEND", isDrip: true })],
      usdRate,
      0,
      asOf,
    );
    expect(cfs).toHaveLength(0);
  });

  it("includes non-DRIP BUY alongside DRIP BUY", () => {
    const cfs = buildXirrCashFlows(
      [
        tx({ type: "BUY", isDrip: false, date: new Date("2024-01-01") }),
        tx({ type: "BUY", isDrip: true, date: new Date("2024-02-01") }),
      ],
      usdRate,
      0,
      asOf,
    );
    // Only the non-DRIP BUY should produce a cash flow
    expect(cfs).toHaveLength(1);
    expect(cfs[0].amount).toBeLessThan(0);
  });

  it("SELL is never treated as DRIP (always included)", () => {
    const cfs = buildXirrCashFlows(
      [tx({ type: "SELL", isDrip: true })],
      usdRate,
      0,
      asOf,
    );
    // SELLs are always included regardless of isDrip
    expect(cfs).toHaveLength(1);
    expect(cfs[0].amount).toBeGreaterThan(0);
  });
});

// ─── Terminal value ────────────────────────────────────────────────────────

describe("buildXirrCashFlows – terminal value", () => {
  it("appends terminal value as a positive cash flow when > 0", () => {
    const cfs = buildXirrCashFlows([], usdRate, 50000, asOf);
    expect(cfs).toHaveLength(1);
    expect(cfs[0].amount).toBe(50000);
    expect(cfs[0].date).toEqual(asOf);
  });

  it("does NOT append terminal value when it is 0", () => {
    const cfs = buildXirrCashFlows([], usdRate, 0, asOf);
    expect(cfs).toHaveLength(0);
  });

  it("does NOT append terminal value when it is negative", () => {
    const cfs = buildXirrCashFlows([], usdRate, -100, asOf);
    expect(cfs).toHaveLength(0);
  });

  it("terminal value uses the provided asOf date", () => {
    const customDate = new Date("2030-12-31");
    const cfs = buildXirrCashFlows([], usdRate, 1000, customDate);
    expect(cfs[0].date).toEqual(customDate);
  });
});

// ─── FX rate conversion ────────────────────────────────────────────────────

describe("buildXirrCashFlows – FX conversion", () => {
  it("multiplies transaction amounts by the FX rate for the account currency", () => {
    // BRL account, rate BRL→USD = 0.20
    const fxRate = (ccy: string) => (ccy === "BRL" ? 0.2 : 1);
    const cfs = buildXirrCashFlows(
      [
        tx({
          type: "BUY",
          quantity: 10,
          unitPrice: 100,
          fee: 0,
          account: { currency: "BRL" },
        }),
      ],
      fxRate,
      0,
      asOf,
    );
    // 10 * 100 * 0.2 = 200 USD
    expect(cfs[0].amount).toBeCloseTo(-200, 2);
  });

  it("applies different FX rates per transaction based on account currency", () => {
    const fxRate = (ccy: string) => {
      if (ccy === "EUR") return 1.1;
      if (ccy === "GBP") return 1.3;
      return 1;
    };
    const cfs = buildXirrCashFlows(
      [
        tx({
          type: "BUY",
          quantity: 1,
          unitPrice: 1000,
          fee: 0,
          account: { currency: "EUR" },
          date: new Date("2024-01-01"),
        }),
        tx({
          type: "BUY",
          quantity: 1,
          unitPrice: 1000,
          fee: 0,
          account: { currency: "GBP" },
          date: new Date("2024-02-01"),
        }),
      ],
      fxRate,
      0,
      asOf,
    );
    expect(cfs[0].amount).toBeCloseTo(-1100, 2); // EUR: 1000 * 1.1
    expect(cfs[1].amount).toBeCloseTo(-1300, 2); // GBP: 1000 * 1.3
  });

  it("terminal value is NOT multiplied by FX (already in base currency)", () => {
    const fxRate = () => 2.0; // should NOT affect terminal value
    const cfs = buildXirrCashFlows([], fxRate, 5000, asOf);
    expect(cfs[0].amount).toBe(5000); // unchanged
  });
});

// ─── Date handling ─────────────────────────────────────────────────────────

describe("buildXirrCashFlows – dates", () => {
  it("preserves each transaction's date on the resulting cash flow", () => {
    const buyDate = new Date("2023-03-15");
    const sellDate = new Date("2024-09-20");
    const cfs = buildXirrCashFlows(
      [
        tx({ type: "BUY", date: buyDate }),
        tx({ type: "SELL", date: sellDate }),
      ],
      usdRate,
      0,
      asOf,
    );
    expect(cfs[0].date).toEqual(buyDate);
    expect(cfs[1].date).toEqual(sellDate);
  });

  it("handles string dates (ISO format) by converting to Date objects", () => {
    const cfs = buildXirrCashFlows(
      [tx({ type: "BUY", date: "2024-05-10T00:00:00.000Z" as unknown as Date })],
      usdRate,
      0,
      asOf,
    );
    expect(cfs[0].date).toBeInstanceOf(Date);
    expect(cfs[0].date.toISOString()).toContain("2024-05-10");
  });
});

// ─── Realistic end-to-end scenario ─────────────────────────────────────────

describe("buildXirrCashFlows – realistic portfolio scenario", () => {
  it("produces correct cash flows for a multi-transaction portfolio", () => {
    const transactions: TransactionForCashFlow[] = [
      // Regular BUY
      tx({
        type: "BUY",
        quantity: 50,
        unitPrice: 100,
        fee: 10,
        date: new Date("2023-01-15"),
        account: { currency: "USD" },
      }),
      // DRIP BUY (should be excluded)
      tx({
        type: "BUY",
        quantity: 2,
        unitPrice: 105,
        fee: 0,
        isDrip: true,
        date: new Date("2023-04-01"),
        account: { currency: "USD" },
      }),
      // Cash dividend
      tx({
        type: "DIVIDEND",
        quantity: 50,
        unitPrice: 0.8,
        fee: 0,
        nraTax: 0.15,
        date: new Date("2023-07-01"),
        account: { currency: "USD" },
      }),
      // DRIP dividend (should be excluded)
      tx({
        type: "DIVIDEND",
        quantity: 50,
        unitPrice: 0.8,
        fee: 0,
        isDrip: true,
        date: new Date("2023-10-01"),
        account: { currency: "USD" },
      }),
      // Partial sell
      tx({
        type: "SELL",
        quantity: 20,
        unitPrice: 120,
        fee: 5,
        date: new Date("2024-01-15"),
        account: { currency: "USD" },
      }),
      // Another BUY in EUR account
      tx({
        type: "BUY",
        quantity: 30,
        unitPrice: 90,
        fee: 8,
        date: new Date("2024-06-01"),
        account: { currency: "EUR" },
      }),
    ];

    const fxRate = (ccy: string) => (ccy === "EUR" ? 1.08 : 1);
    const terminalValue = 15000; // current portfolio value in USD

    const cfs = buildXirrCashFlows(transactions, fxRate, terminalValue, asOf);

    // Expected cash flows:
    // 1. BUY:      -(50 * 100 + 10) * 1   = -5010      on 2023-01-15
    // 2. (DRIP BUY excluded)
    // 3. DIVIDEND: +(50 * 0.8 * 0.85) * 1 = +34        on 2023-07-01
    // 4. (DRIP DIVIDEND excluded)
    // 5. SELL:     +(20 * 120 - 5) * 1    = +2395       on 2024-01-15
    // 6. BUY EUR:  -(30 * 90 + 8) * 1.08  = -2924.64   on 2024-06-01
    // 7. Terminal:  +15000                              on 2025-01-01

    expect(cfs).toHaveLength(5);

    // BUY USD
    expect(cfs[0].amount).toBeCloseTo(-5010, 2);
    expect(cfs[0].date).toEqual(new Date("2023-01-15"));

    // DIVIDEND (net of 15% NRA tax)
    expect(cfs[1].amount).toBeCloseTo(34, 2);
    expect(cfs[1].date).toEqual(new Date("2023-07-01"));

    // SELL
    expect(cfs[2].amount).toBeCloseTo(2395, 2);
    expect(cfs[2].date).toEqual(new Date("2024-01-15"));

    // BUY EUR (converted at 1.08)
    expect(cfs[3].amount).toBeCloseTo(-2924.64, 2);
    expect(cfs[3].date).toEqual(new Date("2024-06-01"));

    // Terminal value
    expect(cfs[4].amount).toBe(15000);
    expect(cfs[4].date).toEqual(asOf);
  });
});

// ─── Empty / edge inputs ───────────────────────────────────────────────────

describe("buildXirrCashFlows – empty / edge inputs", () => {
  it("returns empty array when no transactions and terminal value is 0", () => {
    expect(buildXirrCashFlows([], usdRate, 0, asOf)).toEqual([]);
  });

  it("returns only terminal value when no transactions but portfolio has value", () => {
    const cfs = buildXirrCashFlows([], usdRate, 10000, asOf);
    expect(cfs).toHaveLength(1);
    expect(cfs[0].amount).toBe(10000);
  });

  it("ignores unknown transaction types", () => {
    const cfs = buildXirrCashFlows(
      [tx({ type: "TRANSFER" as never })],
      usdRate,
      0,
      asOf,
    );
    // Unknown type is neither BUY/SELL/DIVIDEND, so no cash flow is produced
    expect(cfs).toHaveLength(0);
  });
});
