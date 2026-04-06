"use client";

import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";

interface SymbolResult {
  ticker: string;
  name: string | null;
  exchange: string | null;
}

interface SymbolComboboxProps {
  defaultValue?: string;
  defaultName?: string;
}

export function SymbolCombobox({
  defaultValue = "",
  defaultName = "",
}: SymbolComboboxProps) {
  const [query, setQuery] = useState(defaultValue.toUpperCase());
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [selectedName, setSelectedName] = useState(defaultName);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive open state from results — avoids synchronous setState in effects
  const isOpen = results.length > 0;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!query || query.length < 1) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(
          `/api/symbols/search?q=${encodeURIComponent(query)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as SymbolResult[];
          setResults(data);
        }
      } catch {
        // silently ignore search errors
      }
    }, query.length < 1 ? 0 : 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectResult(result: SymbolResult) {
    setQuery(result.ticker);
    setSelectedName(result.name ?? "");
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id="symbol"
        name="symbol"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value.toUpperCase());
          setSelectedName("");
        }}
        placeholder="e.g. VT"
        required
        autoComplete="off"
      />
      <input type="hidden" name="symbolName" value={selectedName} />
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {results.map((r) => (
            <button
              key={r.ticker}
              type="button"
              className="flex w-full items-baseline gap-3 px-3 py-2 text-left hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before selection
                selectResult(r);
              }}
            >
              <span className="w-20 shrink-0 font-mono text-sm font-semibold">
                {r.ticker}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {r.name}
                {r.exchange ? ` · ${r.exchange}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
