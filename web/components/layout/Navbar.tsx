'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { TimeRangeSelector } from './TimeRangeSelector'

export function Navbar() {
  const pathname = usePathname()
  const showRangeSelector = !pathname.includes('/recommendations')

  return (
    <header className="shrink-0 border-b border-border px-6 py-4 flex items-center justify-end">
      {showRangeSelector && (
        <Suspense fallback={<div className="h-9 w-64 rounded-lg bg-white/[0.04] animate-pulse" />}>
          <TimeRangeSelector />
        </Suspense>
      )}
    </header>
  )
}
