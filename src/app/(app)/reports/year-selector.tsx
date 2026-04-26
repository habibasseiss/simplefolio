"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function YearSelector({ currentYear, availableYears }: { currentYear: number; availableYears: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onValueChange(val: string) {
    const params = new URLSearchParams(searchParams);
    params.set("year", val);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Ano-base</span>
      <Select value={currentYear.toString()} onValueChange={onValueChange}>
        <SelectTrigger className="w-30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
