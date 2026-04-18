import { findAllTransactionsForUser } from "@/repositories/transaction.repository";
import { getDefaultUserId } from "@/repositories/user.repository";

const HEADER =
  "type,symbol,instrument_type,instrument_provider,purchase_rate,date,quantity,currency,unitprice,fee,nratax,account,reinvestdividends,isdrip";

function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const userId = await getDefaultUserId();
  const transactions = await findAllTransactionsForUser(userId);

  const rows = transactions.map((tx) =>
    [
      tx.type,
      tx.symbol,
      tx.instrumentType,
      tx.instrumentProvider,
      tx.purchaseRate != null ? tx.purchaseRate.toString() : "",
      formatDate(new Date(tx.date)),
      tx.quantity.toString(),
      tx.account.currency,
      tx.unitPrice.toString(),
      tx.fee.toString(),
      tx.nraTax != null ? tx.nraTax.toString() : "",
      escapeField(tx.account.name),
      tx.reinvestDividends ? "true" : "false",
      tx.isDrip ? "true" : "false",
    ].join(",")
  );

  const csv = [HEADER, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });
}
