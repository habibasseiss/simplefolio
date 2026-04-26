import { ClearCacheButton } from "@/components/clear-cache-button"
import { SetHeader } from "@/components/header-context"
import { Page } from "@/components/page"
import { SyncAllButton } from "@/components/sync-all-button"
import { ArrowRightIcon, DownloadIcon, EraserIcon, RefreshCwIcon, UploadIcon } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  return (
    <Page>
      <SetHeader>
        <h1 className="text-base font-medium">Settings</h1>
      </SetHeader>

      <div className="flex flex-col gap-8">
        {/* Data Management */}
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold">Data Management</h2>
            <p className="text-sm text-muted-foreground">
              Import transactions and keep dividend data up to date.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Batch Import — links to sub-page */}
            <Link href="/settings/import" className="group rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <UploadIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Batch Import</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Paste a CSV to bulk-import transactions across any account.
                      New accounts are created automatically when a matching name
                      is not found.
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            {/* Export CSV — direct download */}
            <Link href="/api/export/transactions" className="group rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <DownloadIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Export Transactions</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Download all your transactions as a CSV file. The format
                      is compatible with Batch Import so you can use it as a
                      backup or migrate to another account.
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>

            {/* Sync All — dividends, prices, PTAX rates & snapshots */}
            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <RefreshCwIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-1 flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium">Sync All</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Imports new dividends, fetches latest price history, syncs
                      PTAX exchange rates from BCB, and backfills FX snapshots
                      on any transactions that are missing them. Safe to run at
                      any time — only missing data is downloaded.
                    </p>
                  </div>
                  <div className="flex">
                    <SyncAllButton />
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Cache — inline action */}
            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <EraserIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-1 flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium">Clear Application Cache</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Clears the Next.js server cache. This ensures you see the latest data across all pages if you notice stale information.
                    </p>
                  </div>
                  <div className="flex">
                    <ClearCacheButton />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Page>
  )
}
