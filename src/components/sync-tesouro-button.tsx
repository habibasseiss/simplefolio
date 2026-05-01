"use client";

import { syncTesouroPriceHistoryAction } from "@/actions/tesouro.actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

/**
 * Button that triggers a manual sync of Tesouro Direto PU price history.
 * Mirrors `SyncPriceHistoryButton` in structure and behaviour.
 */
export function SyncTesouroButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const toastId = toast.loading("Syncing bond prices…");
      try {
        const result = await syncTesouroPriceHistoryAction();
        if (result.errors.length > 0) {
          console.warn("[SyncTesouro] Errors for bonds:", result.errors);
          toast.error("Could not sync some bond prices", {
            id: toastId,
            description: result.errors.join(", "),
            duration: 12000,
          });
        } else {
          toast.success(
            result.synced > 0
              ? `Synced ${result.synced} bond price point${result.synced !== 1 ? "s" : ""}`
              : "Bond prices are already up to date",
            { id: toastId },
          );
        }
        router.refresh();
      } catch (err) {
        console.error("[SyncTesouro] Unexpected error:", err);
        toast.error("Bond price sync failed", {
          id: toastId,
          description: err instanceof Error ? err.message : String(err),
          duration: 12000,
        });
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      {isPending ? "Syncing…" : "Sync Bond Prices"}
    </Button>
  );
}
