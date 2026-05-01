'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { TimeRange } from '@/lib/types'

const RANGES: { value: TimeRange; label: string }[] = [
  { value: 'short_term',  label: 'Last 4 Weeks' },
  { value: 'medium_term', label: 'Last 6 Months' },
  { value: 'long_term',   label: 'All Time' },
]

export function TimeRangeSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = (searchParams.get('range') ?? 'short_term') as TimeRange

  function setRange(range: TimeRange) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', range)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-0.5 bg-surface rounded-xl p-1 border border-border">
      {RANGES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setRange(value)}
          className={[
            'px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
            current === value
              ? 'bg-white/[0.08] text-primary'
              : 'text-muted hover:text-primary',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
