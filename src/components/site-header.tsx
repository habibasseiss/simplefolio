"use client"

import { useHeaderContext } from "@/components/header-context"
import { useIsMobile } from '@/hooks/use-mobile'
import { ChevronLeftIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "./ui/button"
import { SidebarTrigger } from './ui/sidebar'

export function SiteHeader() {
  const content = useHeaderContext()
  const isMobile = useIsMobile()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {isMobile && <SidebarTrigger className="-ml-1" />}

        {content.back && (
          <Button variant="ghost" size="icon" asChild className="-ml-1 mr-1">
            <Link href={content.back}>
              <ChevronLeftIcon className="size-4" />
            </Link>
          </Button>
        )}
        <div className="flex flex-1 items-center justify-between gap-4">
          <div>{content.title}</div>
          {content.actions && (
            <div className="flex items-center gap-2">{content.actions}</div>
          )}
        </div>
      </div>
    </header>
  )
}
