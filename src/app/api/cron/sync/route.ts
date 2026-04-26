import { importAllDividendsAction } from "@/actions/dividend.actions";
import { syncAllPriceHistoryAction } from "@/actions/price-history.actions";
import {
  backfillPtaxSnapshotsAction,
  syncPtaxRatesAction,
} from "@/actions/ptax.actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Import dividends and prices in parallel (independent)
    const [dividends, prices] = await Promise.allSettled([
      importAllDividendsAction(false),
      syncAllPriceHistoryAction(),
    ]);

    // Step 2: Sync PTAX rates — runs after dividends so new transactions are included
    const ptaxSync = await syncPtaxRatesAction().then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason: unknown) => ({ status: "rejected" as const, reason }),
    );

    // Step 3: Backfill fxSnapshots on any transactions still missing them
    const ptaxBackfill = await backfillPtaxSnapshotsAction().then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason: unknown) => ({ status: "rejected" as const, reason }),
    );

    const result = {
      dividends: dividends.status === "fulfilled"
        ? dividends.value
        : { error: String(dividends.reason) },
      prices: prices.status === "fulfilled"
        ? prices.value
        : { error: String(prices.reason) },
      ptaxSync: ptaxSync.status === "fulfilled"
        ? ptaxSync.value
        : { error: String(ptaxSync.reason) },
      ptaxBackfill: ptaxBackfill.status === "fulfilled"
        ? ptaxBackfill.value
        : { error: String(ptaxBackfill.reason) },
    };

    console.log("Cron job result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
