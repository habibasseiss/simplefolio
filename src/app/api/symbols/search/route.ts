import { getFinanceProvider } from "@/lib/finance";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 1) return NextResponse.json([]);

  const results = await getFinanceProvider().searchSymbols(q);
  return NextResponse.json(results);
}
