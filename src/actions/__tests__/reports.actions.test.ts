/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import * as userRepo from "@/repositories/user.repository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getReportsData } from "../reports.actions";

vi.mock("@/repositories/user.repository");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: { findMany: vi.fn() },
    fxRateHistory: { findFirst: vi.fn() },
  },
}));

describe("getReportsData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(userRepo.getDefaultUserId).mockResolvedValue("test-user-id");
  });

  it("calculates asset summary correctly from BUY transactions", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: "tx1",
        type: "BUY",
        symbol: "AAPL",
        quantity: 10,
        unitPrice: 150,
        fee: 5,
        date: new Date("2025-05-10T10:00:00Z"),
        fxSnapshots: { "USD/BRL": { source: "PTAX", buy: 5.0, sell: 5.0 } },
        account: { currency: "USD", name: "Broker A" },
      } as any,
    ]);

    const result = await getReportsData(2025);

    expect(result.assets).toHaveLength(1);
    const aapl = result.assets[0];
    expect(aapl.symbol).toBe("AAPL");
    expect(aapl.quantity).toBe(10);
    // Cost = (10 * 150 + 5) * 5.0 = 1505 * 5 = 7525
    expect(aapl.totalCostBrl).toBe(7525);
    expect(aapl.avgCostBrl).toBe(752.5);
  });

  it("uses PTAX sell rate for BUY cost basis and buy rate for SELL proceeds (Lei 14.754/2023)", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: "tx1",
        type: "BUY",
        symbol: "MSFT",
        quantity: 20,
        unitPrice: 100,
        fee: 0,
        date: new Date("2024-05-10T10:00:00Z"),
        // BUY must use sell rate: 5.10
        fxSnapshots: { "USD/BRL": { source: "PTAX", buy: 5.00, sell: 5.10 } },
        account: { currency: "USD" },
      } as any,
      {
        id: "tx2",
        type: "SELL",
        symbol: "MSFT",
        quantity: 10,
        unitPrice: 150,
        fee: 0,
        date: new Date("2025-06-10T10:00:00Z"),
        // SELL must use buy rate: 5.20
        fxSnapshots: { "USD/BRL": { source: "PTAX", buy: 5.20, sell: 5.30 } },
        account: { currency: "USD" },
      } as any,
    ]);

    const result = await getReportsData(2025);

    expect(result.capitalGains).toHaveLength(1);
    const gain = result.capitalGains[0];
    // Cost basis built from BUY uses sell rate 5.10: 20 * 100 * 5.10 = 10200
    // Proportional cost for 10 units = 5100
    expect(gain.costBrl).toBe(5100);
    // Sale proceeds uses buy rate 5.20: 10 * 150 * 5.20 = 7800
    expect(gain.saleValueBrl).toBe(7800);
    expect(gain.gainLossBrl).toBe(2700);
  });

  it("uses PTAX buy rate for DIVIDEND (Lei 14.754/2023)", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: "tx1",
        type: "DIVIDEND",
        symbol: "VOO",
        quantity: 10,
        unitPrice: 2,
        nraTax: 0.3,
        date: new Date("2025-07-01T10:00:00Z"),
        // DIVIDEND must use buy rate: 5.00
        fxSnapshots: { "USD/BRL": { source: "PTAX", buy: 5.00, sell: 5.10 } },
        account: { currency: "USD" },
      } as any,
    ]);

    const result = await getReportsData(2025);

    const div = result.dividends[0];
    // grossBrl uses buy rate 5.00, not sell 5.10
    expect(div.grossBrl).toBe(20 * 5.00); // 100
    expect(div.taxWithheldBrl).toBe(6 * 5.00); // 30
  });

  it("calculates capital gains correctly from SELL transactions", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: "tx1",
        type: "BUY",
        symbol: "MSFT",
        quantity: 20,
        unitPrice: 100,
        fee: 0,
        date: new Date("2024-05-10T10:00:00Z"),
        fxSnapshots: { "USD/BRL": { source: "PTAX", buy: 5.0, sell: 5.0 } },
        account: { currency: "USD" },
      } as any,
      {
        id: "tx2",
        type: "SELL",
        symbol: "MSFT",
        quantity: 10,
        unitPrice: 150,
        fee: 0,
        date: new Date("2025-06-10T10:00:00Z"),
        fxSnapshots: { "USD/BRL": { source: "PTAX", buy: 5.2, sell: 5.2 } },
        account: { currency: "USD" },
      } as any,
    ]);

    const result = await getReportsData(2025);

    expect(result.capitalGains).toHaveLength(1);
    const gain = result.capitalGains[0];
    expect(gain.symbol).toBe("MSFT");
    expect(gain.quantity).toBe(10);
    // Sale value uses buy rate 5.2: 10 * 150 * 5.2 = 7800
    expect(gain.saleValueBrl).toBe(7800);
    // Cost basis uses sell rate 5.0: (20 * 100 * 5.0) / 20 * 10 = 5000
    expect(gain.costBrl).toBe(5000);
    expect(gain.gainLossBrl).toBe(2800);
    expect(gain.tax15Brl).toBe(2800 * 0.15); // 420
  });

  it("calculates dividends and withheld taxes correctly", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: "tx1",
        type: "DIVIDEND",
        symbol: "VOO",
        quantity: 10,
        unitPrice: 2, // $20 gross
        nraTax: 0.3, // 30% tax
        date: new Date("2025-07-01T10:00:00Z"),
        fxSnapshots: { "USD/BRL": { source: "PTAX", buy: 5.0, sell: 5.0 } },
        account: { currency: "USD" },
      } as any,
    ]);

    const result = await getReportsData(2025);

    expect(result.dividends).toHaveLength(1);
    const div = result.dividends[0];
    expect(div.symbol).toBe("VOO");
    expect(div.grossUsd).toBe(20);
    expect(div.taxWithheldUsd).toBe(20 * 0.3); // 6
    expect(div.grossBrl).toBe(20 * 5.0); // 100
    expect(div.taxWithheldBrl).toBe(6 * 5.0); // 30
  });

  it("uses fallback fxRateHistory buyRate for DIVIDEND when fxSnapshots is missing (holiday/weekend)", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: "tx1",
        type: "DIVIDEND",
        symbol: "SCHD",
        quantity: 10,
        unitPrice: 1, // $10 gross
        nraTax: 0.3,
        date: new Date("2025-08-01T10:00:00Z"),
        fxSnapshots: null,
        account: { currency: "USD" },
      } as any,
    ]);

    vi.mocked(prisma.fxRateHistory.findFirst).mockResolvedValue({
      id: "fx1",
      date: new Date("2025-07-31T10:00:00Z"),
      currency: "USD",
      buyRate: 4.8,
      sellRate: 4.9,
      source: "PTAX",
    } as any);

    const result = await getReportsData(2025);

    expect(prisma.fxRateHistory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ currency: "USD" }),
      }),
    );

    const div = result.dividends[0];
    expect(div.symbol).toBe("SCHD");
    expect(div.grossUsd).toBe(10);
    expect(div.taxWithheldUsd).toBe(3);
    // DIVIDEND fallback uses buyRate = 4.8 (not sellRate = 4.9)
    expect(div.grossBrl).toBe(10 * 4.8); // 48
    expect(div.taxWithheldBrl).toBe(3 * 4.8); // 14.4
  });

  it("uses fallback fxRateHistory sellRate for BUY when fxSnapshots is missing", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: "tx1",
        type: "BUY",
        symbol: "SCHD",
        quantity: 10,
        unitPrice: 100,
        fee: 0,
        date: new Date("2025-08-01T10:00:00Z"),
        fxSnapshots: null,
        account: { currency: "USD", name: "Broker A" },
      } as any,
    ]);

    vi.mocked(prisma.fxRateHistory.findFirst).mockResolvedValue({
      id: "fx1",
      date: new Date("2025-07-31T10:00:00Z"),
      currency: "USD",
      buyRate: 4.8,
      sellRate: 4.9,
      source: "PTAX",
    } as any);

    const result = await getReportsData(2025);

    const asset = result.assets[0];
    // BUY fallback uses sellRate = 4.9 (not buyRate = 4.8)
    expect(asset.totalCostBrl).toBe(10 * 100 * 4.9); // 4900
  });

  it("excludes capital gains and ptax history for transactions outside the base year", async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: "tx1",
        type: "BUY",
        symbol: "AAPL",
        quantity: 10,
        unitPrice: 100,
        fee: 0,
        date: new Date("2024-05-10T10:00:00Z"), // prev year
        fxSnapshots: { "USD/BRL": { source: "PTAX", buy: 5.0, sell: 5.0 } },
        account: { currency: "USD" },
      } as any,
      {
        id: "tx2",
        type: "SELL",
        symbol: "AAPL",
        quantity: 10,
        unitPrice: 150,
        fee: 0,
        date: new Date("2024-06-10T10:00:00Z"), // prev year
        fxSnapshots: { "USD/BRL": { source: "PTAX", buy: 5.2, sell: 5.2 } },
        account: { currency: "USD" },
      } as any,
    ]);

    const result = await getReportsData(2025);

    // Prev year sell should NOT be in capitalGains of the current base year
    expect(result.capitalGains).toHaveLength(0);
    // Prev year buy/sell should NOT be in the ptax history table either
    expect(result.ptaxHistory).toHaveLength(0);
  });
});
