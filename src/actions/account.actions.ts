"use server";

import {
  createAccountSchema,
  updateAccountSchema,
} from "@/domain/account/account.schema";
import {
  createAccount,
  deleteAccount,
  updateAccount,
} from "@/repositories/account.repository";
import { getDefaultUserId } from "@/repositories/user.repository";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createAccountAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createAccountSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getDefaultUserId();
  const account = await createAccount(userId, parsed.data);

  revalidatePath("/accounts");
  redirect(`/accounts/${account.id}`);
}

export async function updateAccountAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateAccountSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const userId = await getDefaultUserId();
  await updateAccount(id, userId, parsed.data);

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  redirect(`/accounts/${id}`);
}

export async function deleteAccountAction(id: string): Promise<ActionResult> {
  const userId = await getDefaultUserId();
  await deleteAccount(id, userId);

  revalidatePath("/accounts");
  redirect("/accounts");
}
