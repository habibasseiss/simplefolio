import { SetHeader } from "@/components/header-context";
import { Page } from "@/components/page";
import { ConstructionIcon } from "lucide-react";

export default function ReportsPage() {
  return (
    <Page>
      <SetHeader>
        <h1 className="text-base font-medium">Reports</h1>
      </SetHeader>

      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
          <ConstructionIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Reports — Coming Soon</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Tax reporting, including Brazilian capital gains and dividend tax
            reports, will be available here soon.
          </p>
        </div>
      </div>
    </Page>
  );
}
