/* eslint-disable @typescript-eslint/no-explicit-any */
import * as finance from "@/lib/finance";
import { prisma } from "@/lib/prisma";
import * as txRepo from "@/repositories/transaction.repository";
import * as userRepo from "@/repositories/user.repository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  importAllDividendsAction,
  importDividendsAction,
} from "../dividend.actions";

vi.mock("@/repositories/transaction.repository");
vi.mock("@/repositories/user.repository");
vi.mock("@/lib/finance");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    account: { findMany: vi.fn() },
    transaction: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    priceHistory: { findFirst: vi.fn() },
  },
}));

describe("Dividend Actions", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.mocked(userRepo.getDefaultUserId).mockResolvedValue("user-1");
  });

  describe("importDividendsAction", () => {
    it("returns 0 if no dividends fetched", async () => {
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn(),
        getDividends: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await importDividendsAction("AAPL");
      expect(result).toEqual({
        inserted: 0,
        skipped: 0,
        error: "No dividend data found for AAPL",
      });
    });

    it("returns error if API call fails", async () => {
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn(),
        getDividends: vi.fn().mockRejectedValue(new Error("Network error")),
      } as any);

      const result = await importDividendsAction("AAPL");
      expect(result.error).toBe("Failed to fetch dividends");
    });

    it("processes dividends and creates a DRIP buy using net dividend divided by price history", async () => {
      vi.stubEnv("NRA_TAX", "0.15");
      const getDividends = vi.fn().mockResolvedValue([
        {
          amount: 1.5,
          exDividendDate: "2024-03-01",
          paymentDate: "2024-03-15",
        },
      ]);
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn(),
        getDividends,
      } as any);

      // Mock an account holding 100 shares of AAPL that reinvests dividends
      vi.mocked(prisma.account.findMany).mockResolvedValue([{
        id: "acc-1",
        transactions: [
          {
            type: "BUY",
            symbol: "AAPL",
            date: new Date("2024-01-01"),
            quantity: 100,
            reinvestDividends: true,
          },
        ],
      }] as any);

      vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null); // no existing dividend
      vi.mocked(prisma.priceHistory.findFirst).mockResolvedValue(
        { close: 150 } as any,
      );

      const result = await importDividendsAction("AAPL");

      expect(result.inserted).toBe(1);
      expect(getDividends).toHaveBeenCalledWith("AAPL", undefined);
      expect(prisma.priceHistory.findFirst).toHaveBeenCalledWith({
        where: {
          symbol: "AAPL",
          date: { lte: new Date("2024-03-09T00:00:00.000Z") },
        },
        orderBy: { date: "desc" },
      });
      // It should create the dividend itself
      expect(prisma.transaction.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            accountId: "acc-1",
            type: "DIVIDEND",
            symbol: "AAPL",
            date: new Date("2024-03-15"),
            quantity: 100,
            unitPrice: 1.5,
            nraTax: 0.15,
          }),
        }),
      );
      // It should create the DRIP buy
      expect(prisma.transaction.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            accountId: "acc-1",
            type: "BUY",
            isDrip: true,
            symbol: "AAPL",
            date: new Date("2024-03-15"),
            quantity: 0.85,
            unitPrice: 150,
            fee: 0,
            nraTax: 0.15,
          }),
        }),
      );
    });

    it("skips an existing dividend when overwrite is false", async () => {
      const getDividends = vi.fn().mockResolvedValue([
        {
          amount: 1.5,
          exDividendDate: "2024-03-01",
          paymentDate: "2024-03-15",
        },
      ]);
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn(),
        getDividends,
      } as any);
      vi.mocked(prisma.account.findMany).mockResolvedValue([{
        id: "acc-1",
        transactions: [
          {
            type: "BUY",
            symbol: "AAPL",
            date: new Date("2024-01-01"),
            quantity: 100,
            reinvestDividends: true,
          },
        ],
      }] as any);
      vi.mocked(prisma.transaction.findFirst)
        .mockResolvedValueOnce({ date: new Date("2024-03-15") } as any)
        .mockResolvedValueOnce({ id: "div-existing" } as any);

      const result = await importDividendsAction("AAPL");

      expect(result).toEqual({ inserted: 0, skipped: 1 });
      expect(getDividends).toHaveBeenCalledWith(
        "AAPL",
        new Date("2024-03-15"),
      );
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(prisma.transaction.update).not.toHaveBeenCalled();
      expect(prisma.priceHistory.findFirst).not.toHaveBeenCalled();
    });

    it("updates existing dividend and DRIP buy when overwrite is true", async () => {
      vi.stubEnv("NRA_TAX", "0.15");
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn(),
        getDividends: vi.fn().mockResolvedValue([
          {
            amount: 1.5,
            exDividendDate: "2024-03-01",
            paymentDate: "2024-03-15",
          },
        ]),
      } as any);
      vi.mocked(prisma.account.findMany).mockResolvedValue([{
        id: "acc-1",
        transactions: [
          {
            type: "BUY",
            symbol: "AAPL",
            date: new Date("2024-01-01"),
            quantity: 100,
            reinvestDividends: true,
          },
        ],
      }] as any);
      vi.mocked(prisma.transaction.findFirst)
        .mockResolvedValueOnce({ id: "div-existing" } as any)
        .mockResolvedValueOnce({ id: "drip-existing" } as any);
      vi.mocked(prisma.priceHistory.findFirst).mockResolvedValue(
        { close: 150 } as any,
      );

      const result = await importDividendsAction("AAPL", true);

      expect(result).toEqual({ inserted: 0, skipped: 1 });
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(prisma.transaction.update).toHaveBeenNthCalledWith(1, {
        where: { id: "div-existing" },
        data: expect.objectContaining({
          quantity: 100,
          unitPrice: 1.5,
          nraTax: 0.15,
        }),
      });
      expect(prisma.transaction.update).toHaveBeenNthCalledWith(2, {
        where: { id: "drip-existing" },
        data: expect.objectContaining({
          quantity: 0.85,
          unitPrice: 150,
          nraTax: 0.15,
        }),
      });
    });
  });

  describe("importAllDividendsAction", () => {
    it("aggregates results across symbols", async () => {
      vi.mocked(txRepo.findAllSymbols).mockResolvedValue([
        { symbol: "AAPL", instrumentType: "EQUITY", instrumentProvider: "YAHOO" },
        { symbol: "SHOP", instrumentType: "EQUITY", instrumentProvider: "YAHOO" },
      ]);

      // Override importDividends internally or just mock the dependencies
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn(),
        getDividends: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await importAllDividendsAction();
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].symbol).toBe("AAPL");
      expect(result.errors[1].symbol).toBe("SHOP");
    });
  });
});
