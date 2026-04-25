"use client";

import { backfillPtaxSnapshotsAction, syncPtaxRatesAction } from "@/actions/ptax.actions";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export function SyncPtaxButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      toast.info("Syncing PTAX rates...");
      const syncResult = await syncPtaxRatesAction();

      if (syncResult.errors.length > 0) {
        toast.warning(
          `Could not sync some PTAX rates: ${syncResult.errors.join(", ")}`,
        );
      }

      const backfillResult = await backfillPtaxSnapshotsAction();

      toast.success(
        `PTAX Sync Complete: Synced ${syncResult.synced} new rates. Backfilled ${backfillResult.updated} transactions.`,
      );
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <RefreshCwIcon className={isPending ? "animate-spin" : ""} />
      {isPending ? "Syncing..." : "Sync & Backfill PTAX"}
    </Button>
  );
}
