"use client";

import { importAllDividendsAction } from "@/actions/dividend.actions";
import { syncAllPriceHistoryAction } from "@/actions/price-history.actions";
import {
  backfillPtaxSnapshotsAction,
  syncPtaxRatesAction,
} from "@/actions/ptax.actions";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export function SyncAllButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const toastId = toast.loading("Syncing data…");

      // Step 1: dividends + prices in parallel
      const [dividends, prices] = await Promise.allSettled([
        importAllDividendsAction(false),
        syncAllPriceHistoryAction(),
      ]);

      // Step 2: PTAX rates (after dividends so new transactions are included)
      const ptaxSync = await syncPtaxRatesAction();

      // Step 3: backfill fxSnapshots on any transactions still missing them
      const ptaxBackfill = await backfillPtaxSnapshotsAction();

      // Collect warnings
      const warnings: string[] = [];
      if (dividends.status === "rejected") {
        warnings.push(`Dividends: ${dividends.reason}`);
      } else if (dividends.value.errors.length > 0) {
        warnings.push(
          `Dividends: could not fetch ${dividends.value.errors.map((e) => e.symbol).join(", ")}`,
        );
      }
      if (prices.status === "rejected") {
        warnings.push(`Prices: ${prices.reason}`);
      } else if (prices.value.errors.length > 0) {
        warnings.push(
          `Prices: could not fetch ${prices.value.errors.join(", ")}`,
        );
      }
      if (ptaxSync.errors.length > 0) {
        warnings.push(`PTAX: ${ptaxSync.errors.join(", ")}`);
      }

      toast.dismiss(toastId);

      if (warnings.length > 0) {
        toast.warning(warnings.join(" · "));
      }

      const dividendsInserted =
        dividends.status === "fulfilled" ? dividends.value.inserted : 0;
      const pricesSynced =
        prices.status === "fulfilled" ? prices.value.synced : 0;

      toast.success(
        [
          dividendsInserted > 0 && `${dividendsInserted} new dividend(s)`,
          pricesSynced > 0 && `${pricesSynced} price point(s)`,
          ptaxSync.synced > 0 && `${ptaxSync.synced} PTAX rate(s)`,
          ptaxBackfill.updated > 0 &&
          `${ptaxBackfill.updated} snapshot(s) backfilled`,
        ]
          .filter(Boolean)
          .join(", ") || "Everything is already up to date",
      );

      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      <RefreshCwIcon className={isPending ? "animate-spin" : ""} />
      {isPending ? "Syncing…" : "Sync All"}
    </Button>
  );
}
