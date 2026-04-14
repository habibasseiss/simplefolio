"use client"

import { deleteTransactionAction } from "@/actions/transaction.actions"
import { Button } from "@/components/ui/button"
import { Trash2Icon } from "lucide-react"
import { useTransition } from "react"

export function DeleteTransactionButton({
  txId,
}: {
  txId: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm("Delete this transaction? This cannot be undone.")) return
    startTransition(async () => {
      await deleteTransactionAction(txId)
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
