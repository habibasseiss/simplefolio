/* eslint-disable @typescript-eslint/no-explicit-any */
import { backfillPtaxSnapshotsAction } from "../ptax.actions";
import { prisma } from "@/lib/prisma";
import * as userRepo from "@/repositories/user.repository";
import * as fxRepo from "@/repositories/fx-rate-history.repository";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/repositories/user.repository");
vi.mock("@/repositories/fx-rate-history.repository");

describe("ptax.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepo.getDefaultUserId).mockResolvedValue("user-1");
  });

  describe("backfillPtaxSnapshotsAction", () => {
    it("returns 0 if no transactions need backfill", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
      const result = await backfillPtaxSnapshotsAction();
      expect(result).toEqual({ updated: 0, skipped: 0 });
    });

    it("skips BRL transactions and updates foreign currency transactions", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([
        { id: "tx-brl", date: new Date("2024-03-01"), account: { currency: "BRL" } } as any,
        { id: "tx-usd", date: new Date("2024-03-01"), account: { currency: "USD" } } as any,
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
        "USD"
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

    it("skips transactions if no PTAX rate is found for the date", async () => {
      vi.mocked(prisma.transaction.findMany).mockResolvedValue([
        { id: "tx-usd", date: new Date("2024-03-01"), account: { currency: "USD" } } as any,
      ]);

      // Return empty map, simulating a weekend/holiday where no rate is found
      vi.mocked(fxRepo.findFxRatesByDates).mockResolvedValue(new Map());

      const result = await backfillPtaxSnapshotsAction();

      expect(result).toEqual({ updated: 0, skipped: 1 });
      expect(prisma.transaction.update).not.toHaveBeenCalled();
    });
  });
});
