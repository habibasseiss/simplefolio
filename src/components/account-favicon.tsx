"use client"

import { getFaviconUrls } from "@/lib/favicon"
import Image from "next/image"
import { useState } from "react"

interface AccountFaviconProps {
  website: string
  /** Rendered size in pixels (width = height). Defaults to 20. */
  size?: number
  className?: string
}

/**
 * Renders the institution favicon for a given website URL.
 * Falls back through the provider chain on error; renders nothing when all fail.
 */
export function AccountFavicon({ website, size = 20, className }: AccountFaviconProps) {
  const urls = getFaviconUrls(website)
  const [index, setIndex] = useState(0)

  if (index >= urls.length) return null

  return (
    <Image
      src={urls[index]}
      alt="Institution logo"
      width={size}
      height={size}
      className={className}
      unoptimized
      onError={() => setIndex((i) => i + 1)}
    />
  )
}
