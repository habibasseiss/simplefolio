"use client"

import { syncAllPriceHistoryAction } from "@/actions/price-history.actions"
import { Button } from "@/components/ui/button"
import { RefreshCwIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

export function SyncPriceHistoryButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      const result = await syncAllPriceHistoryAction()

      if (result.errors.length > 0) {
        toast.warning(`Could not fetch prices for: ${result.errors.join(", ")}`)
      }

      if (result.synced > 0) {
        toast.success(
          `Synced ${result.synced} weekly price point${result.synced !== 1 ? "s" : ""}`,
        )
        router.refresh()
      } else if (result.errors.length === 0) {
        toast.info("Price history is already up to date")
      }
    })
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <RefreshCwIcon className={isPending ? "animate-spin" : ""} />
      {isPending ? "Syncing…" : "Sync Price History"}
    </Button>
  )
}
