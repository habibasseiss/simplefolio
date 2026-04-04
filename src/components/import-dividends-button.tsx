"use client"

import { importDividendsAction } from "@/actions/dividend.actions"
import { Button } from "@/components/ui/button"
import { DownloadIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

export function ImportDividendsButton({ symbol }: { symbol: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      const result = await importDividendsAction(symbol)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(
          `Imported ${result.inserted} dividend transaction${result.inserted !== 1 ? "s" : ""}` +
          (result.skipped > 0 ? ` (${result.skipped} skipped)` : ""),
        )
        router.refresh()
      }
    })
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <DownloadIcon />
      {isPending ? "Importing…" : "Get Dividends"}
    </Button>
  )
}
