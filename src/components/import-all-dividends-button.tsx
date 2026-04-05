"use client"

import { importAllDividendsAction } from "@/actions/dividend.actions"
import { Button } from "@/components/ui/button"
import { DownloadIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

export function ImportAllDividendsButton({ overwrite = false }: { overwrite?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      const result = await importAllDividendsAction(overwrite)
      const hasInserts = result.inserted > 0
      const hasErrors = result.errors.length > 0

      if (hasInserts) {
        toast.success(
          `Imported ${result.inserted} dividend transaction${result.inserted !== 1 ? "s" : ""}` +
          (result.skipped > 0 ? ` (${result.skipped} skipped)` : ""),
        )
        router.refresh()
      }

      if (hasErrors) {
        const failed = result.errors.map((e) => e.symbol).join(", ")
        toast.warning(`Could not fetch dividends for: ${failed}`)
      }

      if (!hasInserts && !hasErrors) {
        toast.info("No new dividends found")
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
