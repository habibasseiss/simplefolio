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
} from "../transaction.actions";

vi.mock("@/repositories/account.repository");
vi.mock("@/repositories/symbol.repository");
vi.mock("@/repositories/transaction.repository");
vi.mock("@/repositories/user.repository");
vi.mock("@/lib/finance");
vi.mock("next/cache");

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
      } catch (e) {
        expect(e).toBeInstanceOf(RedirectError);
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
      } catch (e) {
        expect(e).toBeInstanceOf(RedirectError);
      }
      expect(txRepo.deleteTransaction).toHaveBeenCalledWith("tx-1", "acc-1");
      expect(cache.revalidatePath).toHaveBeenCalledWith("/accounts/acc-1");
    });
  });
});
