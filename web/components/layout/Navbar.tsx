'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { TimeRangeSelector } from './TimeRangeSelector'
import { BrandLogo } from './BrandLogo'

export function Navbar() {
  const pathname = usePathname()
  const showRangeSelector = !pathname.includes('/recommendations')

  return (
    <header className="shrink-0 border-b border-border px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 items-center">
        <BrandLogo href="/dashboard/tracks" showWordmark={false} className="sm:hidden" />
        <BrandLogo href="/dashboard/tracks" className="hidden sm:inline-flex" />
      </div>
      <div className="flex min-w-0 items-center justify-end">
        {showRangeSelector && (
          <Suspense fallback={<div className="h-9 w-44 rounded-lg bg-white/[0.04] animate-pulse sm:w-64" />}>
            <TimeRangeSelector />
          </Suspense>
        )}
      </div>
    </header>
  )
}
