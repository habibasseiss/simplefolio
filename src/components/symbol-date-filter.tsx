"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, XIcon } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useRef } from "react"

export function SymbolDateFilter({
  from,
  to,
}: {
  from?: string
  to?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fromRef = useRef<HTMLInputElement>(null)
  const toRef = useRef<HTMLInputElement>(null)

  const applyRange = useCallback(
    (newFrom: string, newTo: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (newFrom) params.set("from", newFrom)
      else params.delete("from")
      if (newTo) params.set("to", newTo)
      else params.delete("to")
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const handleFromChange = useCallback(
    (value: string) => applyRange(value, toRef.current?.value ?? to ?? ""),
    [applyRange, to],
  )

  const handleToChange = useCallback(
    (value: string) => applyRange(fromRef.current?.value ?? from ?? "", value),
    [applyRange, from],
  )

  const setThisYear = useCallback(() => {
    const year = new Date().getFullYear()
    const f = `${year}-01-01`
    const t = `${year}-12-31`
    if (fromRef.current) fromRef.current.value = f
    if (toRef.current) toRef.current.value = t
    applyRange(f, t)
  }, [applyRange])

  const setLastYear = useCallback(() => {
    const year = new Date().getFullYear() - 1
    const f = `${year}-01-01`
    const t = `${year}-12-31`
    if (fromRef.current) fromRef.current.value = f
    if (toRef.current) toRef.current.value = t
    applyRange(f, t)
  }, [applyRange])

  const clearFilters = useCallback(() => {
    if (fromRef.current) fromRef.current.value = ""
    if (toRef.current) toRef.current.value = ""
    applyRange("", "")
  }, [applyRange])

  const hasFilters = !!from || !!to

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasFilters ? "secondary" : "outline"}
          size="icon"
          className="relative"
          aria-label="Filter by date"
        >
          <CalendarIcon />
          {hasFilters && (
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={setThisYear}
          >
            This year
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={setLastYear}
          >
            Last year
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="filter-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              ref={fromRef}
              id="filter-from"
              type="date"
              className="h-8 text-sm"
              defaultValue={from ?? ""}
              onChange={(e) => handleFromChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="filter-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              ref={toRef}
              id="filter-to"
              type="date"
              className="h-8 text-sm"
              defaultValue={to ?? ""}
              onChange={(e) => handleToChange(e.target.value)}
            />
          </div>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={clearFilters}
          >
            <XIcon className="size-3.5" />
            Clear filter
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
