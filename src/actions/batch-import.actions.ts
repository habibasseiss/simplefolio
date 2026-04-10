"use server";

import {
  bondTickerToName,
  isTesouroBond,
} from "@/domain/tesouro/tesouro.utils";
import {
  type CreateTransactionInput,
  createTransactionSchema,
} from "@/domain/transaction/transaction.schema";
import { getFinanceProvider } from "@/lib/finance";
import {
  createAccount,
  findAccountByName,
} from "@/repositories/account.repository";
import { ensureSymbol, upsertSymbol } from "@/repositories/symbol.repository";
import { createTransaction } from "@/repositories/transaction.repository";
import { getDefaultUserId } from "@/repositories/user.repository";

export type RowResult =
  | {
    row: number;
    status: "ok";
    symbol: string;
    account: string;
    created?: boolean;
  }
  | { row: number; status: "error"; raw: string; reason: string };

export type BatchImportResult = {
  results: RowResult[];
  imported: number;
  failed: number;
};

const CSV_HEADER = [
  "type",
  "symbol",
  "date",
  "quantity",
  "currency",
  "unitprice",
  "fee",
  "nratax",
  "account",
  "reinvestdividends",
  "isdrip",
];

function parseCSV(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim()));
  return { headers, rows };
}

export async function batchImportAction(
  csv: string,
): Promise<BatchImportResult> {
  const userId = await getDefaultUserId();
  const { headers, rows } = parseCSV(csv);

  // Validate headers
  const missingHeaders = CSV_HEADER.filter(
    (h) =>
      h !== "nratax" && h !== "reinvestdividends" && h !== "isdrip" &&
      !headers.includes(h),
  );
  if (missingHeaders.length > 0) {
    return {
      imported: 0,
      failed: 1,
      results: [
        {
          row: 0,
          status: "error",
          raw: "",
          reason: `Missing required columns: ${missingHeaders.join(", ")}`,
        },
      ],
    };
  }

  const col = (row: string[], name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? (row[idx] ?? "").trim() : "";
  };

  const results: RowResult[] = [];
  const importedSymbols = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const raw = row.join(",");
    const rowNum = i + 2; // 1-based + header offset

    const accountName = col(row, "account");
    if (!accountName) {
      results.push({
        row: rowNum,
        status: "error",
        raw,
        reason: "Account name is empty",
      });
      continue;
    }

    const currency = col(row, "currency").toUpperCase();
    if (!currency || currency.length !== 3) {
      results.push({
        row: rowNum,
        status: "error",
        raw,
        reason:
          `Invalid or missing currency "${currency}" — must be a 3-letter ISO 4217 code`,
      });
      continue;
    }

    let account = await findAccountByName(accountName, userId);
    let accountCreated = false;
    if (!account) {
      account = await createAccount(userId, { name: accountName, currency });
      accountCreated = true;
    }

    const nraTaxRaw = col(row, "nratax");
    const nraTax = nraTaxRaw ? parseFloat(nraTaxRaw) : null;
    const reinvestDividendsRaw = col(row, "reinvestdividends").toLowerCase();
    const reinvestDividends = reinvestDividendsRaw === "true" ||
      reinvestDividendsRaw === "yes" ||
      reinvestDividendsRaw === "1";

    const isDripRaw = col(row, "isdrip").toLowerCase();
    const isDrip = isDripRaw === "true" || isDripRaw === "yes" ||
      isDripRaw === "1";

    const parsed = createTransactionSchema.safeParse({
      type: col(row, "type"),
      symbol: col(row, "symbol"),
      date: col(row, "date"),
      quantity: col(row, "quantity"),
      unitPrice: col(row, "unitprice"),
      fee: col(row, "fee") || "0",
      nraTax: nraTax,
      reinvestDividends,
      isDrip,
    });

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const reason = Object.entries(errors)
        .map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`)
        .join("; ");
      results.push({ row: rowNum, status: "error", raw, reason });
      continue;
    }

    try {
      await createTransaction(
        account.id,
        parsed.data as CreateTransactionInput,
      );
      importedSymbols.add(parsed.data.symbol);
      results.push({
        row: rowNum,
        status: "ok",
        symbol: parsed.data.symbol,
        account: account.name,
        created: accountCreated,
      });
    } catch (e) {
      results.push({
        row: rowNum,
        status: "error",
        raw,
        reason: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  // Enrich the Symbol table with names fetched in parallel
  if (importedSymbols.size > 0) {
    const provider = getFinanceProvider();
    await Promise.all(
      [...importedSymbols].map(async (ticker) => {
        if (isTesouroBond(ticker)) {
          await upsertSymbol(
            ticker,
            bondTickerToName(ticker),
            "Tesouro Direto",
          );
        } else {
          const { name, exchange } = await provider.getSymbolInfo(ticker);
          if (name !== null || exchange !== null) {
            await upsertSymbol(ticker, name, exchange);
          } else {
            await ensureSymbol(ticker);
          }
        }
      }),
    );
  }

  return {
    results,
    imported: results.filter((r) => r.status === "ok").length,
    failed: results.filter((r) => r.status === "error").length,
  };
}
