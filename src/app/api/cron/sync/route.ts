import { importAllDividendsAction } from "@/actions/dividend.actions";
import { syncAllPriceHistoryAction } from "@/actions/price-history.actions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [dividends, prices] = await Promise.allSettled([
      importAllDividendsAction(false),
      syncAllPriceHistoryAction(),
    ]);

    const result = {
      dividends: dividends.status === "fulfilled"
        ? dividends.value
        : { error: String(dividends.reason) },
      prices: prices.status === "fulfilled"
        ? prices.value
        : { error: String(prices.reason) },
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
