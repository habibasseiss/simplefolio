"use client"

import {
  batchImportAction,
  type BatchImportResult,
} from "@/actions/batch-import.actions"
import { SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { Button } from "@/components/ui/button"
import { CheckCircle2Icon, Loader2Icon, UploadIcon, XCircleIcon } from "lucide-react"
import { useRef, useState, useTransition } from "react"

const EXAMPLE_CSV = `type,symbol,date,quantity,currency,unitPrice,fee,nraTax,account,reinvestDividends,isDrip
BUY,VT,2025-11-17,7.19580283,USD,138.9699,0.0,,Schwab,true,false`

export default function BatchImportPage() {
  const [result, setResult] = useState<BatchImportResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleImport() {
    const csv = textareaRef.current?.value ?? ""
    if (!csv.trim()) return
    setResult(null)
    startTransition(async () => {
      const res = await batchImportAction(csv)
      setResult(res)
    })
  }

  return (
    <Page>
      <SetHeader back="/settings">
        <h1 className="text-base font-medium">Batch Import</h1>
      </SetHeader>

      <div className="flex flex-col gap-6 max-w-3xl w-full">
        <p className="text-sm text-muted-foreground">
          Paste a CSV with your transactions below. The{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">account</code>{" "}
          column must match an existing account name (case-insensitive). If no
          match is found a new account is created using the provided{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">currency</code>.
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              CSV Data
            </p>
            <p className="text-xs text-muted-foreground">
              Required columns:{" "}
              <code className="rounded bg-muted px-1 text-xs">
                type, symbol, date, quantity, currency, unitPrice, fee, account
              </code>
            </p>
          </div>
          <textarea
            ref={textareaRef}
            defaultValue={EXAMPLE_CSV}
            spellCheck={false}
            className="min-h-48 w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Paste CSV here…"
          />
        </div>

        <Button
          onClick={handleImport}
          disabled={isPending}
          className="self-start"
        >
          {isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <UploadIcon className="size-4" />
          )}
          {isPending ? "Importing…" : "Import"}
        </Button>

        {result && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2Icon className="size-4" />
                {result.imported} imported
              </span>
              {result.failed > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-destructive">
                  <XCircleIcon className="size-4" />
                  {result.failed} failed
                </span>
              )}
            </div>

            {result.results.some((r) => r.status === "error") && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="border-b border-destructive/20 px-4 py-2 text-xs font-medium text-destructive">
                  Errors
                </p>
                <ul className="divide-y divide-destructive/10">
                  {result.results
                    .filter((r) => r.status === "error")
                    .map((r) => (
                      <li key={r.row} className="px-4 py-2 text-sm">
                        <span className="font-medium text-muted-foreground">
                          Row {r.row}:
                        </span>{" "}
                        <span className="text-destructive">{r.reason}</span>
                        {r.raw && (
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate">
                            {r.raw}
                          </p>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {result.results.some((r) => r.status === "ok") && (
              <div className="rounded-lg border">
                <p className="border-b px-4 py-2 text-xs font-medium text-muted-foreground">
                  Imported Rows
                </p>
                <ul className="divide-y">
                  {result.results
                    .filter((r) => r.status === "ok")
                    .map((r) => (
                      <li
                        key={r.row}
                        className="flex items-center gap-3 px-4 py-2 text-sm"
                      >
                        <CheckCircle2Icon className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                        <span className="font-mono font-medium">{r.symbol}</span>
                        <span className="text-muted-foreground">→ {r.account}</span>
                        {r.created && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            new account
                          </span>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">
                          row {r.row}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  )
}
