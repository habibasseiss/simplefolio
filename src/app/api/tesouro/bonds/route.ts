import { fetchTesouroBonds } from "@/lib/tesouro";
import { NextResponse } from "next/server";

/**
 * GET /api/tesouro/bonds
 *
 * Returns a list of currently available Tesouro Direto bond quotes.
 * Used by the TesouroBondCombobox for autocomplete / pre-population of the
 * unit price field.
 *
 * Query parameters:
 *   q      — optional title filter (case-insensitive partial match)
 *   type   — "compra" | "venda" (default: "compra")
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") === "venda" ? "venda" : "compra";

  try {
    const { data: bonds } = await fetchTesouroBonds({
      title: q || undefined,
      type,
      limit: 50,
    });

    // Return a simplified shape for the UI
    const result = bonds.map((b) => ({
      id: b.id,
      title: b.type,
      maturityDate: b.maturityDate,
      baseDate: b.baseDate,
      puCompra: b.puCompra,
      taxaCompra: b.taxaCompra,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/tesouro/bonds] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bond quotes" },
      { status: 502 },
    );
  }
}
