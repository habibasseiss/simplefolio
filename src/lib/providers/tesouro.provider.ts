/**
 * TesouroProvider — DataProvider implementation for Tesouro Direto bonds.
 *
 * Fetches weekly PU (Preço Unitário) candles from the Tesouro Direto API
 * and downsamples daily data to weekly (Monday-snapped) candles.
 *
 * This provider is DB-free: it only fetches and transforms data.
 * The upsert into PriceHistory is handled by the action layer.
 */

import type { PriceCandle } from "@/lib/finance";
import { fetchTesouroBonds } from "@/lib/tesouro";
import { registerProvider } from "./registry";
import type { DataProvider } from "./types";

class TesouroProvider implements DataProvider {
  readonly id = "TESOURO";
  readonly label = "Tesouro Direto";
  readonly instrumentType = "BOND";

  /**
   * Fetches all available historical compra (purchase) PU quotes for
   * the given Tesouro bond, paginating through the API as needed.
   *
   * @param ticker    The bare bond name as stored in the DB, e.g. "TESOURO_SELIC_2029".
   *                  The human-readable form is derived by replacing underscores with spaces
   *                  and applying title case.
   * @param fromDate  ISO date (YYYY-MM-DD); only return quotes on or after this date.
   */
  async syncPriceHistory(
    ticker: string,
    fromDate?: string,
  ): Promise<PriceCandle[]> {
    const bondName = this._tickerToName(ticker);

    // Paginate through all pages of the Tesouro API
    let allBonds: Awaited<ReturnType<typeof fetchTesouroBonds>>["data"] = [];
    const pageSize = 500;
    let page = 1;
    let totalPages = 1;

    do {
      const response = await fetchTesouroBonds({
        title: bondName,
        type: "compra",
        limit: pageSize,
        page,
        history: true,
        fromDate,
      });
      allBonds = allBonds.concat(response.data);
      totalPages = response.meta.totalPages;
      page++;
    } while (page <= totalPages);

    if (allBonds.length === 0) return [];

    return this._downsampleToWeekly(allBonds);
  }

  /**
   * Converts a DB ticker (e.g. "TESOURO_SELIC_2029") to the human-readable
   * bond name the Tesouro API expects (e.g. "Tesouro Selic 2029").
   */
  private _tickerToName(ticker: string): string {
    return ticker
      .replace(/_/g, " ")
      .replace(/\w+/g, (word) => word.charAt(0) + word.slice(1).toLowerCase());
  }

  /**
   * Downsamples daily PU data to weekly Monday-snapped candles.
   * For each calendar week, uses the first available trading day's puCompra.
   * This matches the weekly candle format used by the Yahoo Finance provider.
   */
  private _downsampleToWeekly(
    bonds: Awaited<ReturnType<typeof fetchTesouroBonds>>["data"],
  ): PriceCandle[] {
    const weekMap = new Map<string, number>();

    for (const b of bonds) {
      if (b.puCompra <= 0) continue;
      const d = new Date(b.baseDate + "T00:00:00Z");
      // Snap to Monday: subtract (dayOfWeek - 1) days, treating 0 = Sunday as 6
      const dow = d.getUTCDay();
      const daysToMonday = dow === 0 ? 6 : dow - 1;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - daysToMonday);
      const key = monday.toISOString().split("T")[0];
      // Keep the first (earliest) entry for the week
      if (!weekMap.has(key)) weekMap.set(key, b.puCompra);
    }

    return Array.from(weekMap.entries()).map(([date, close]) => ({
      date,
      close,
      currency: "BRL",
    }));
  }
}

/** The singleton TesouroProvider instance — auto-registers itself. */
export const tesouroProvider = new TesouroProvider();
registerProvider(tesouroProvider);
