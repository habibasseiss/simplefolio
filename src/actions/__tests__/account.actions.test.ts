import * as accountRepo from "@/repositories/account.repository";
import * as userRepo from "@/repositories/user.repository";
import * as cache from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAccountAction,
  deleteAccountAction,
  updateAccountAction,
} from "../account.actions";

vi.mock("@/repositories/account.repository", () => ({
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
}));

vi.mock("@/repositories/user.repository", () => ({
  getDefaultUserId: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock redirect to throw so we can catch it like standard Next.js
class RedirectError extends Error {}
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));

describe("Account Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepo.getDefaultUserId).mockResolvedValue("user-1");
  });

  describe("createAccountAction", () => {
    it("returns field errors for invalid data", async () => {
      const formData = new FormData();
      // missing name, missing currency
      const result = await createAccountAction({}, formData);
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors?.name).toBeDefined();
    });

    it("creates account and redirects", async () => {
      const formData = new FormData();
      formData.append("name", "TFSA");
      formData.append("currency", "CAD");

      vi.mocked(accountRepo.createAccount).mockResolvedValue({
        id: "acc-1",
        name: "TFSA",
        currency: "CAD",
        website: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      try {
        await createAccountAction({}, formData);
        expect.unreachable("Should have thrown redirect");
      } catch (e) {
        expect(e).toBeInstanceOf(RedirectError);
        expect((e as Error).message).toBe("/accounts/acc-1");
      }

      expect(accountRepo.createAccount).toHaveBeenCalledWith("user-1", {
        name: "TFSA",
        currency: "CAD",
      });
      expect(cache.revalidatePath).toHaveBeenCalledWith("/accounts");
    });
  });

  describe("updateAccountAction", () => {
    it("updates account and redirects", async () => {
      const formData = new FormData();
      formData.append("name", "Margin");

      vi.mocked(accountRepo.updateAccount).mockResolvedValue({
        id: "acc-2",
        name: "Margin",
        currency: "USD",
        website: null,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      try {
        await updateAccountAction("acc-2", {}, formData);
        expect.unreachable("Should have thrown redirect");
      } catch (e) {
        expect(e).toBeInstanceOf(RedirectError);
        expect((e as Error).message).toBe("/accounts/acc-2");
      }

      expect(accountRepo.updateAccount).toHaveBeenCalledWith(
        "acc-2",
        "user-1",
        { name: "Margin" },
      );
      expect(cache.revalidatePath).toHaveBeenCalledWith("/accounts");
      expect(cache.revalidatePath).toHaveBeenCalledWith("/accounts/acc-2");
    });
  });

  describe("deleteAccountAction", () => {
    it("deletes account and redirects to /accounts", async () => {
      try {
        await deleteAccountAction("acc-3");
        expect.unreachable("Should have thrown redirect");
      } catch (e) {
        expect(e).toBeInstanceOf(RedirectError);
        expect((e as Error).message).toBe("/accounts");
      }

      expect(accountRepo.deleteAccount).toHaveBeenCalledWith("acc-3", "user-1");
      expect(cache.revalidatePath).toHaveBeenCalledWith("/accounts");
    });
  });
});
