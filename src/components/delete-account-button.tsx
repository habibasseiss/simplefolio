"use client"

import { deleteAccountAction } from "@/actions/account.actions"
import { Button } from "@/components/ui/button"
import { Trash2Icon } from "lucide-react"
import { useTransition } from "react"

export function DeleteAccountButton({ accountId }: { accountId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm("Delete this account and all its transactions? This cannot be undone.")) return
    startTransition(async () => {
      await deleteAccountAction(accountId)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2Icon className="size-4" />
      {isPending ? "Deleting…" : "Delete"}
    </Button>
  )
}
