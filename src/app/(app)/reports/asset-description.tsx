"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssetSummary } from "@/actions/reports.actions";

export function AssetDescription({ assets, baseYear }: { assets: AssetSummary[]; baseYear: number }) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(assets[0]?.symbol || "");
  const selectedAsset = assets.find((a) => a.symbol === selectedSymbol);

  let descriptionText = "";
  if (selectedAsset) {
    descriptionText = `${selectedAsset.quantity} cotas do ${selectedAsset.type} ${selectedAsset.symbol}, custodiadas no exterior na corretora ${selectedAsset.broker}, Estados Unidos.
Aquisições realizadas em datas anteriores a ${baseYear + 1}.
Investimento mantido no exterior.`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Selecione um ativo" />
          </SelectTrigger>
          <SelectContent>
            {assets.map((a) => (
              <SelectItem key={a.symbol} value={a.symbol}>
                {a.symbol} - {a.type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground whitespace-pre-wrap">
        {descriptionText}
      </div>
    </div>
  );
}
