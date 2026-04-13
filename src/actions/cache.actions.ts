"use server"

import { revalidatePath } from "next/cache"

export async function clearCacheAction() {
  revalidatePath("/", "layout")
  return { success: true }
}
