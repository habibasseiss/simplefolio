/* eslint-disable @typescript-eslint/no-explicit-any */
import * as finance from "@/lib/finance";
import * as accountRepo from "@/repositories/account.repository";
import * as symbolRepo from "@/repositories/symbol.repository";
import * as txRepo from "@/repositories/transaction.repository";
import * as userRepo from "@/repositories/user.repository";
import * as cache from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "../transaction.actions";
import * as ptaxActions from "@/actions/ptax.actions";
import { prisma } from "@/lib/prisma";

vi.mock("@/repositories/account.repository");
vi.mock("@/repositories/symbol.repository");
vi.mock("@/repositories/transaction.repository");
vi.mock("@/repositories/user.repository");
vi.mock("@/lib/finance");
vi.mock("next/cache");
vi.mock("@/actions/ptax.actions");
vi.mock("@/lib/prisma", () => ({
  prisma: { transaction: { update: vi.fn() } },
}));

class RedirectError extends Error {}
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));

describe("Transaction Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepo.getDefaultUserId).mockResolvedValue("user-1");
    vi.mocked(accountRepo.findAccountById).mockResolvedValue({
      id: "acc-1",
      name: "TFSA",
      currency: "CAD",
      website: null,
      userId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(finance.getFinanceProvider).mockReturnValue({
      getSymbolInfo: vi.fn().mockResolvedValue({
        name: "Apple Inc.",
        exchange: "NASDAQ",
      }),
      getDividends: vi.fn(),
    } as any);
    vi.mocked(ptaxActions.buildPtaxSnapshotForTransaction).mockResolvedValue(null);
    vi.mocked(prisma.transaction.update).mockResolvedValue({} as any);
  });

  describe("createTransactionAction", () => {
    it("creates BUY transaction successfully", async () => {
      const formData = new FormData();
      formData.append("type", "BUY");
      formData.append("symbol", "AAPL");
      formData.append("date", "2024-03-01T00:00:00Z");
      formData.append("quantity", "10");
      formData.append("unitPrice", "150");

      try {
        await createTransactionAction("acc-1", {}, formData);
        expect.unreachable("Should have thrown redirect");
      } catch (e) {
        expect(e).toBeInstanceOf(RedirectError);
        expect((e as Error).message).toBe("/accounts/acc-1");
      }

      expect(txRepo.createTransaction).toHaveBeenCalledWith(
        "acc-1",
        expect.objectContaining({
          type: "BUY",
          symbol: "AAPL",
          quantity: 10,
          unitPrice: 150,
        }),
      );
      expect(symbolRepo.upsertSymbol).toHaveBeenCalledWith({
        ticker: "AAPL",
        name: "Apple Inc.",
        exchange: "NASDAQ",
      });
      expect(cache.revalidatePath).toHaveBeenCalledWith("/accounts/acc-1");
    });

    it("attaches fxSnapshots if available", async () => {
      vi.mocked(txRepo.createTransaction).mockResolvedValue({ id: "tx-123" } as any);
      vi.mocked(ptaxActions.buildPtaxSnapshotForTransaction).mockResolvedValue({
        "CAD/BRL": { source: "PTAX", buy: 3.5, sell: 3.6 },
      });

      const formData = new FormData();
      formData.append("type", "BUY");
      formData.append("symbol", "AAPL");
      formData.append("date", "2024-03-01T00:00:00Z");
      formData.append("quantity", "10");
      formData.append("unitPrice", "150");

      try {
        await createTransactionAction("acc-1", {}, formData);
        expect.unreachable("Should have thrown redirect");
      } catch (e) {
        expect(e).toBeInstanceOf(RedirectError);
        expect((e as Error).message).toBe("/accounts/acc-1");
      }

      expect(ptaxActions.buildPtaxSnapshotForTransaction).toHaveBeenCalledWith("CAD", new Date("2024-03-01T00:00:00Z"));
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "tx-123" },
        data: {
          fxSnapshots: {
            "CAD/BRL": { source: "PTAX", buy: 3.5, sell: 3.6 },
          },
        },
      });
    });

    it("throws error if account not found", async () => {
      vi.mocked(accountRepo.findAccountById).mockResolvedValue(null);
      const formData = new FormData();
      formData.append("type", "BUY");
      formData.append("symbol", "AAPL");
      formData.append("date", "2024-03-01");
      formData.append("quantity", "10");
      formData.append("unitPrice", "150");

      await expect(createTransactionAction("acc-1", {}, formData)).rejects
        .toThrow("Account not found");
    });
  });

  describe("updateTransactionAction", () => {
    it("updates transaction, snapshots PTAX, upserts symbol, and revalidates moved accounts", async () => {
      vi.mocked(txRepo.findTransactionById).mockResolvedValue({
        id: "tx-1",
        accountId: "acc-old",
        account: { id: "acc-old", name: "Old Account", currency: "USD" },
      } as any);
      vi.mocked(accountRepo.findAccountById).mockResolvedValue({
        id: "acc-new",
        name: "New Account",
        currency: "USD",
        website: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(finance.getFinanceProvider).mockReturnValue({
        getSymbolInfo: vi.fn().mockResolvedValue({
          name: "Microsoft Corporation",
          exchange: "NASDAQ",
        }),
        getDividends: vi.fn(),
      } as any);
      vi.mocked(ptaxActions.buildPtaxSnapshotForTransaction).mockResolvedValue({
        "USD/BRL": { source: "PTAX", buy: 5.1, sell: 5.2 },
      });

      const formData = new FormData();
      formData.append("accountId", "acc-new");
      formData.append("type", "BUY");
      formData.append("symbol", "MSFT");
      formData.append("date", "2024-04-01T00:00:00Z");
      formData.append("quantity", "3");
      formData.append("unitPrice", "250");
      formData.append("fee", "1.5");

      try {
        await updateTransactionAction("tx-1", {}, formData);
        expect.unreachable("Should have thrown redirect");
      } catch (e) {
        expect(e).toBeInstanceOf(RedirectError);
        expect((e as Error).message).toBe("/accounts/acc-new");
      }

      expect(txRepo.updateTransaction).toHaveBeenCalledWith(
        "tx-1",
        "acc-old",
        expect.objectContaining({
          accountId: "acc-new",
          type: "BUY",
          symbol: "MSFT",
          date: new Date("2024-04-01T00:00:00Z"),
          quantity: 3,
          unitPrice: 250,
          fee: 1.5,
        }),
      );
      expect(ptaxActions.buildPtaxSnapshotForTransaction).toHaveBeenCalledWith(
        "USD",
        new Date("2024-04-01T00:00:00Z"),
      );
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "tx-1" },
        data: {
          fxSnapshots: {
            "USD/BRL": { source: "PTAX", buy: 5.1, sell: 5.2 },
          },
        },
      });
      expect(symbolRepo.upsertSymbol).toHaveBeenCalledWith({
        ticker: "MSFT",
        name: "Microsoft Corporation",
        exchange: "NASDAQ",
      });
      expect(cache.revalidatePath).toHaveBeenCalledWith("/accounts/acc-new");
      expect(cache.revalidatePath).toHaveBeenCalledWith("/accounts/acc-old");
    });

    it("returns an error when transaction is not found", async () => {
      vi.mocked(txRepo.findTransactionById).mockResolvedValue(null);

      const result = await updateTransactionAction("tx-missing", {}, new FormData());

      expect(result).toEqual({ error: "Transaction not found" });
      expect(txRepo.updateTransaction).not.toHaveBeenCalled();
      expect(cache.revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("deleteTransactionAction", () => {
    it("deletes transaction and redirects", async () => {
      vi.mocked(txRepo.findTransactionById).mockResolvedValue(
        {
          id: "tx-1",
          accountId: "acc-1",
          account: { id: "acc-1", name: "TFSA", currency: "CAD" },
        } as any,
      );
      try {
        await deleteTransactionAction("tx-1");
        expect.unreachable("Should have thrown redirect");
      } catch (e) {
        expect(e).toBeInstanceOf(RedirectError);
        expect((e as Error).message).toBe("/accounts/acc-1");
      }
      expect(txRepo.deleteTransaction).toHaveBeenCalledWith("tx-1", "acc-1");
      expect(cache.revalidatePath).toHaveBeenCalledWith("/accounts/acc-1");
    });
  });
});
