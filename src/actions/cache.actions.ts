"use server"

import { refresh, revalidatePath } from "next/cache"

export async function clearCacheAction() {
  // 1. Nuke the entire Server-side Data Cache and Route Cache
  revalidatePath("/", "layout")

  // 2. Aggressively tell the browser's Client-side Router Cache to dump and refresh
  refresh()

  return { success: true }
}
