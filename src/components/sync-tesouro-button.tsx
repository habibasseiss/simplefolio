"use client";

import { syncTesouroPriceHistoryAction } from "@/actions/tesouro.actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Button that triggers a manual sync of Tesouro Direto PU price history.
 * Mirrors `SyncPriceHistoryButton` in structure and behaviour.
 */
export function SyncTesouroButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await syncTesouroPriceHistoryAction();
        if (result.errors.length > 0) {
          console.warn("[SyncTesouro] Errors for bonds:", result.errors);
        }
        router.refresh();
      } catch (err) {
        console.error("[SyncTesouro] Unexpected error:", err);
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      {isPending ? "Syncing…" : "Sync Bond Prices"}
    </Button>
  );
}
