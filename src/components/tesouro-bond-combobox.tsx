"use client";

import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";

interface BondResult {
  id: string;
  title: string;
  maturityDate: string;
  baseDate: string;
  puCompra: number;
  taxaCompra: number;
}

interface TesouroBondComboboxProps {
  /** Pre-selected bond title (human-readable), e.g. "Tesouro Selic 2029" */
  defaultValue?: string;
  /** Callback fired when a bond is selected, so the form can pre-fill the unit price */
  onBondSelect?: (bond: BondResult) => void;
}

/**
 * Autocomplete combobox for Tesouro Direto bond titles.
 *
 * Calls `GET /api/tesouro/bonds?q=<query>` and lets the user pick a bond.
 * On selection it emits the full bond object (including puCompra) so the
 * parent form can auto-fill the unit price.
 *
 * Mirrors the architecture of SymbolCombobox.
 */
export function TesouroBondCombobox({
  defaultValue = "",
  onBondSelect,
}: TesouroBondComboboxProps) {
  const [query, setQuery] = useState(defaultValue);
  const [results, setResults] = useState<BondResult[]>([]);
  const [selectedBond, setSelectedBond] = useState<BondResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  const isOpen = results.length > 0;

  // Load initial bonds list on mount (empty query = all available bonds)
  useEffect(() => {
    async function loadInitial() {
      try {
        const res = await fetch("/api/tesouro/bonds?type=compra");
        if (res.ok) {
          const data = (await res.json()) as BondResult[];
          // Pre-populate if we have a defaultValue
          if (defaultValue) {
            // Don't show the dropdown, just mark dirty — user can search
          }
          setResults(data);
        }
      } catch {
        // silent
      }
    }
    loadInitial();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDirtyRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const url = query
          ? `/api/tesouro/bonds?q=${encodeURIComponent(query)}`
          : "/api/tesouro/bonds";
        const res = await fetch(url);
        if (res.ok) {
          const data = (await res.json()) as BondResult[];
          setResults(data);
        }
      } catch {
        // silent
      }
    }, 300);

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

  function selectBond(bond: BondResult) {
    setQuery(bond.title);
    setSelectedBond(bond);
    setResults([]);
    onBondSelect?.(bond);
  }

  function formatDate(iso: string) {
    // e.g. "2029-03-01" → "Mar 2029"
    const d = new Date(iso + "T12:00:00Z");
    return d.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden field carries the human-readable bond name to the form action */}
      <input type="hidden" name="bondName" value={selectedBond?.title ?? defaultValue} />

      <Input
        id="bondName-display"
        value={query}
        onChange={(e) => {
          isDirtyRef.current = true;
          setQuery(e.target.value);
          setSelectedBond(null);
        }}
        placeholder="e.g. Tesouro Selic 2029"
        autoComplete="off"
      />

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {results.map((bond) => (
            <button
              key={bond.id}
              type="button"
              className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                selectBond(bond);
              }}
            >
              <span className="text-sm font-semibold">{bond.title}</span>
              <span className="flex gap-3 text-xs text-muted-foreground">
                <span>Venc. {formatDate(bond.maturityDate)}</span>
                <span>PU: R$ {bond.puCompra.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                <span>Taxa: {bond.taxaCompra.toFixed(2)}% a.a.</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
