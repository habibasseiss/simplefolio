/**
 * Integration tests for getReportsData — runs against the REAL database.
 *
 * Prerequisites:
 *   - PostgreSQL running: docker compose up db -d
 *   - DATABASE_URL set in .env
 *
 * These tests do NOT use any mocks. They call getReportsData exactly as the
 * /reports page does and assert the values seen in production, acting as a
 * regression guard against logic or schema changes.
 *
 * Expected values were validated against the raw DB on 2026-04-26 and
 * confirmed to match the /reports?year=2025 page output exactly.
 */

import "dotenv/config";
import { describe, expect, it } from "vitest";
import { getReportsData } from "../reports.actions";

describe("getReportsData (integration — real DB)", () => {
  // -------------------------------------------------------------------------
  // 2025 baseline
  // -------------------------------------------------------------------------

  describe("year 2025", () => {
    it("returns all 6 expected assets", async () => {
      const data = await getReportsData(2025);
      const symbols = data.assets.map((a) => a.symbol).sort();
      expect(symbols).toEqual(["SGOV", "VOO", "VT", "VTI", "VWRA.L", "VXUS"]);
    });

    it("SGOV — correct quantity and BRL cost basis", async () => {
      const data = await getReportsData(2025);
      const asset = data.assets.find((a) => a.symbol === "SGOV")!;
      expect(asset.quantity).toBeCloseTo(12.2162, 4);
      expect(asset.totalCostBrl).toBeCloseTo(6705.33, 2);
      expect(asset.prevYearTotalCostBrl).toBeCloseTo(0, 2);
    });

    it("VOO — correct quantity and BRL cost basis", async () => {
      const data = await getReportsData(2025);
      const asset = data.assets.find((a) => a.symbol === "VOO")!;
      expect(asset.quantity).toBeCloseTo(10.0923, 4);
      expect(asset.totalCostBrl).toBeCloseTo(28940.35, 2);
      expect(asset.prevYearTotalCostBrl).toBeCloseTo(7649.28, 2);
    });

    it("VT — correct quantity and BRL cost basis", async () => {
      const data = await getReportsData(2025);
      const asset = data.assets.find((a) => a.symbol === "VT")!;
      expect(asset.quantity).toBeCloseTo(92.3582, 4);
      expect(asset.totalCostBrl).toBeCloseTo(66501.74, 2);
      expect(asset.prevYearTotalCostBrl).toBeCloseTo(11679.55, 2);
    });

    it("VTI — correct quantity and BRL cost basis", async () => {
      const data = await getReportsData(2025);
      const asset = data.assets.find((a) => a.symbol === "VTI")!;
      expect(asset.quantity).toBeCloseTo(33.6111, 4);
      expect(asset.totalCostBrl).toBeCloseTo(37703.84, 2);
      // prevYear = totalCostBrl minus 2025 DRIP BUY reinvestments (~44.80 BRL)
      expect(asset.prevYearTotalCostBrl).toBeGreaterThan(37640);
      expect(asset.prevYearTotalCostBrl).toBeLessThan(37680);
    });

    it("VWRA.L — correct quantity and BRL cost basis", async () => {
      const data = await getReportsData(2025);
      const asset = data.assets.find((a) => a.symbol === "VWRA.L")!;
      expect(asset.quantity).toBeCloseTo(8.0562, 4);
      expect(asset.totalCostBrl).toBeCloseTo(7119.45, 2);
      expect(asset.prevYearTotalCostBrl).toBeCloseTo(0, 2);
    });

    it("VXUS — correct quantity and BRL cost basis", async () => {
      const data = await getReportsData(2025);
      const asset = data.assets.find((a) => a.symbol === "VXUS")!;
      expect(asset.quantity).toBeCloseTo(51.6736, 4);
      expect(asset.totalCostBrl).toBeCloseTo(15299.84, 2);
      // No VXUS BUYs in 2025, so prevYear equals totalCostBrl
      expect(asset.prevYearTotalCostBrl).toBeCloseTo(15299.84, 2);
    });

    it("no capital gains (no sales in 2025)", async () => {
      const data = await getReportsData(2025);
      expect(data.capitalGains).toHaveLength(0);
    });

    it("returns all 5 expected dividend symbols", async () => {
      const data = await getReportsData(2025);
      const symbols = data.dividends.map((d) => d.symbol).sort();
      expect(symbols).toEqual(["SGOV", "VOO", "VT", "VTI", "VXUS"]);
    });

    it("SGOV dividends — correct gross USD and BRL", async () => {
      const data = await getReportsData(2025);
      const div = data.dividends.find((d) => d.symbol === "SGOV")!;
      expect(div.grossUsd).toBeCloseTo(23.39, 2);
      expect(div.grossBrl).toBeCloseTo(126.57, 2);
    });

    it("VOO dividends — correct gross USD and BRL", async () => {
      const data = await getReportsData(2025);
      const div = data.dividends.find((d) => d.symbol === "VOO")!;
      expect(div.grossUsd).toBeCloseTo(44.87, 2);
      expect(div.grossBrl).toBeCloseTo(246.25, 2);
    });

    it("VT dividends — correct gross USD and BRL", async () => {
      const data = await getReportsData(2025);
      const div = data.dividends.find((d) => d.symbol === "VT")!;
      expect(div.grossUsd).toBeCloseTo(182.13, 2);
      expect(div.grossBrl).toBeCloseTo(1000.34, 2);
    });

    it("VTI dividends — correct gross USD and BRL", async () => {
      const data = await getReportsData(2025);
      const div = data.dividends.find((d) => d.symbol === "VTI")!;
      expect(div.grossUsd).toBeCloseTo(126.18, 2);
      expect(div.grossBrl).toBeCloseTo(696.64, 2);
    });

    it("VXUS dividends — correct gross USD and BRL", async () => {
      const data = await getReportsData(2025);
      const div = data.dividends.find((d) => d.symbol === "VXUS")!;
      expect(div.grossUsd).toBeCloseTo(123.96, 2);
      expect(div.grossBrl).toBeCloseTo(681.76, 2);
    });
  });
});
