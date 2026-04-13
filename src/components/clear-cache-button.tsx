"use client"

import { clearCacheAction } from "@/actions/cache.actions"
import { Button } from "@/components/ui/button"
import { EraserIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

export function ClearCacheButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      await clearCacheAction()
      toast.success("Cache cleared successfully")
      router.refresh()
    })
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <EraserIcon className="size-4" />
      {isPending ? "Clearing…" : "Clear Cache"}
    </Button>
  )
}
