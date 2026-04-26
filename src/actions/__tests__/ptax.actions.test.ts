/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import * as ptaxLib from "@/lib/ptax";
import * as fxRepo from "@/repositories/fx-rate-history.repository";
import * as userRepo from "@/repositories/user.repository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  backfillPtaxSnapshotsAction,
  syncPtaxRatesAction,
} from "../ptax.actions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    fxRateHistory: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/repositories/user.repository");
vi.mock("@/repositories/fx-rate-history.repository");
vi.mock("@/lib/ptax");

describe("ptax.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepo.getDefaultUserId).mockResolvedValue("user-1");
  });

  // ---------------------------------------------------------------------------
  // backfillPtaxSnapshotsAction
  // ---------------------------------------------------------------------------

  describe("backfillPtaxSnapshotsAction", () => {
    it("returns 0 if no transactions need backfill", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
      const result = await backfillPtaxSnapshotsAction();
      expect(result).toEqual({ updated: 0, skipped: 0 });
    });

    it("skips BRL transactions and updates foreign currency transactions", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([
        {
          id: "tx-brl",
          date: new Date("2024-03-01"),
          account: { currency: "BRL" },
        } as any,
        {
          id: "tx-usd",
          date: new Date("2024-03-01"),
          account: { currency: "USD" },
        } as any,
      ]);

      const rateMap = new Map();
      rateMap.set("2024-03-01", {
        date: new Date("2024-03-01"),
        currency: "USD",
        source: "PTAX",
        buyRate: 4.95,
        sellRate: 4.96,
      });

      vi.mocked(fxRepo.findFxRatesByDates).mockResolvedValue(rateMap);
      vi.mocked(prisma.transaction.update).mockResolvedValue({} as any);

      const result = await backfillPtaxSnapshotsAction();

      expect(result).toEqual({ updated: 1, skipped: 1 });
      expect(fxRepo.findFxRatesByDates).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Date)]),
        "USD",
      );
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "tx-usd" },
        data: {
          fxSnapshots: {
            "USD/BRL": { source: "PTAX", buy: 4.95, sell: 4.96 },
          },
        },
      });
    });

    it("falls back to nearest previous trading day when exact date is a holiday", async () => {
      // Transaction on a holiday (e.g. Tiradentes, 2025-04-21)
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([
        {
          id: "tx-holiday",
          date: new Date("2025-04-21"),
          account: { currency: "USD" },
        } as any,
      ]);

      // No exact-match rate in FxRateHistory
      vi.mocked(fxRepo.findFxRatesByDates).mockResolvedValue(new Map());

      // DB findFirst returns the previous Friday's rate
      vi.mocked(prisma.fxRateHistory.findFirst as any).mockResolvedValue({
        date: new Date("2025-04-17"),
        currency: "USD",
        source: "PTAX",
        buyRate: 5.85,
        sellRate: 5.86,
      });
      vi.mocked(prisma.transaction.update).mockResolvedValue({} as any);

      const result = await backfillPtaxSnapshotsAction();

      expect(result).toEqual({ updated: 1, skipped: 0 });
      expect(prisma.fxRateHistory.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ currency: "USD", source: "PTAX" }),
          orderBy: { date: "desc" },
        }),
      );
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "tx-holiday" },
        data: {
          fxSnapshots: {
            "USD/BRL": { source: "PTAX", buy: 5.85, sell: 5.86 },
          },
        },
      });
    });

    it("skips transactions when no rate exists even after fallback", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([
        {
          id: "tx-usd",
          date: new Date("2024-03-01"),
          account: { currency: "USD" },
        } as any,
      ]);

      vi.mocked(fxRepo.findFxRatesByDates).mockResolvedValue(new Map());
      vi.mocked(prisma.fxRateHistory.findFirst as any).mockResolvedValue(null);

      const result = await backfillPtaxSnapshotsAction();

      expect(result).toEqual({ updated: 0, skipped: 1 });
      expect(prisma.transaction.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // syncPtaxRatesAction
  // ---------------------------------------------------------------------------

  describe("syncPtaxRatesAction", () => {
    it("returns zeros when no non-BRL transactions exist", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([
        { date: new Date("2024-03-01"), account: { currency: "BRL" } } as any,
      ]);
      const result = await syncPtaxRatesAction();
      expect(result).toEqual({ synced: 0, skipped: 0, errors: [] });
    });

    it("skips dates already present in FxRateHistory", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([
        { date: new Date("2024-03-01"), account: { currency: "USD" } } as any,
      ]);
      vi.mocked(fxRepo.findMissingFxDates).mockResolvedValue([]);

      const result = await syncPtaxRatesAction();

      expect(result).toEqual({ synced: 0, skipped: 1, errors: [] });
      expect(ptaxLib.getPtaxRatePeriod).not.toHaveBeenCalled();
    });

    it("uses the previous trading day rate when target date is a holiday", async () => {
      // Transaction on Tiradentes (2025-04-21 — Brazilian holiday, Monday)
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([
        { date: new Date("2025-04-21"), account: { currency: "USD" } } as any,
      ]);
      vi.mocked(fxRepo.findMissingFxDates).mockResolvedValue([
        new Date("2025-04-21T00:00:00.000Z"),
      ]);

      // BCB returns no rate for 04-21 but has Friday 04-17 in the extended range
      const rateMap = new Map([["2025-04-17", { buy: 5.85, sell: 5.86 }]]);
      vi.mocked(ptaxLib.getPtaxRatePeriod).mockResolvedValue(rateMap);
      vi.mocked(fxRepo.upsertFxRates).mockResolvedValue(1);

      const result = await syncPtaxRatesAction();

      expect(result).toEqual({ synced: 1, skipped: 0, errors: [] });
      expect(fxRepo.upsertFxRates).toHaveBeenCalledWith([
        expect.objectContaining({
          date: new Date("2025-04-21T00:00:00.000Z"),
          buyRate: 5.85,
          sellRate: 5.86,
          currency: "USD",
          source: "PTAX",
        }),
      ]);
    });

    it("counts as skipped when no rate found even after lookback", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([
        { date: new Date("2025-04-21"), account: { currency: "USD" } } as any,
      ]);
      vi.mocked(fxRepo.findMissingFxDates).mockResolvedValue([
        new Date("2025-04-21T00:00:00.000Z"),
      ]);

      // Empty map — no rate for the date or the 7 days before it
      vi.mocked(ptaxLib.getPtaxRatePeriod).mockResolvedValue(new Map());
      vi.mocked(fxRepo.upsertFxRates).mockResolvedValue(0);

      const result = await syncPtaxRatesAction();

      expect(result).toEqual({ synced: 0, skipped: 1, errors: [] });
    });

    it("records an error when the BCB API call fails", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([
        { date: new Date("2024-03-01"), account: { currency: "USD" } } as any,
      ]);
      vi.mocked(fxRepo.findMissingFxDates).mockResolvedValue([
        new Date("2024-03-01T00:00:00.000Z"),
      ]);
      vi.mocked(ptaxLib.getPtaxRatePeriod).mockRejectedValue(
        new Error("network error"),
      );

      const result = await syncPtaxRatesAction();

      expect(result.errors).toEqual(["USD: network error"]);
    });
  });
});
