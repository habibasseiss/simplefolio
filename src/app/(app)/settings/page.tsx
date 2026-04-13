import { SetHeader } from "@/components/header-context"
import { ImportAllDividendsButton } from "@/components/import-all-dividends-button"
import { Page } from "@/components/page"
import { SyncPriceHistoryButton } from "@/components/sync-price-history-button"
import { ClearCacheButton } from "@/components/clear-cache-button"
import { ArrowRightIcon, BarChart2Icon, DownloadIcon, EraserIcon, RefreshCwIcon, UploadIcon } from "lucide-react"
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

            {/* Refetch All Dividends — inline action */}
            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <RefreshCwIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-1 flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium">Refetch All Dividends</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Re-fetches dividends for every symbol in your portfolio and
                      overwrites existing dividend transactions with the latest
                      data. Use this when your share counts have changed due to
                      new buys or sells.
                    </p>
                  </div>
                  <ImportAllDividendsButton overwrite />
                </div>
              </div>
            </div>

            {/* Sync Price History — inline action */}
            <div className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <BarChart2Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex flex-1 flex-col gap-3">
                  <div>
                    <p className="text-sm font-medium">Sync Price History</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Fetches weekly adjusted-close prices for every symbol in your portfolio. Only missing weeks are downloaded — run this once to backfill history and then periodically to extend it.
                    </p>
                  </div>
                  <SyncPriceHistoryButton />
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
