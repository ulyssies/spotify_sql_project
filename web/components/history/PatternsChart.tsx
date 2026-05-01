'use client'

import type { DowPattern, HourPattern } from '@/lib/types'

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12a'
  if (i < 12) return `${i}a`
  if (i === 12) return '12p'
  return `${i - 12}p`
})

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface HourProps {
  data: HourPattern[]
}

export function HourPatternChart({ data }: HourProps) {
  const filled: HourPattern[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: data.find((d) => d.hour === h)?.count ?? 0,
  }))
  const max = Math.max(...filled.map((d) => d.count), 1)

  return (
    <div className="bg-[#111111] rounded-xl p-5 border border-[#1f1f1f]">
      <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-4">
        Hour of day (UTC)
      </p>
      <div className="flex items-end gap-[3px] h-24">
        {filled.map((d) => {
          const pct = (d.count / max) * 100
          return (
            <div key={d.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-t-[2px] bg-[#1DB954] opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
              <span className="text-[8px] text-[#444] group-hover:text-[#888]">
                {d.hour % 6 === 0 ? HOUR_LABELS[d.hour] : ''}
              </span>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1f1f1f] text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {HOUR_LABELS[d.hour]}: {d.count.toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface DowProps {
  data: DowPattern[]
}

export function DowPatternChart({ data }: DowProps) {
  const filled: DowPattern[] = Array.from({ length: 7 }, (_, dow) => ({
    dow,
    count: data.find((d) => d.dow === dow)?.count ?? 0,
  }))
  const max = Math.max(...filled.map((d) => d.count), 1)

  return (
    <div className="bg-[#111111] rounded-xl p-5 border border-[#1f1f1f]">
      <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-4">
        Day of week
      </p>
      <div className="flex items-end gap-2 h-24">
        {filled.map((d) => {
          const pct = (d.count / max) * 100
          return (
            <div key={d.dow} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full rounded-t-[2px] bg-[#818cf8] opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ height: `${Math.max(pct, 2)}%` }}
              />
              <span className="text-[9px] text-[#555] group-hover:text-[#888]">
                {DOW_LABELS[d.dow].slice(0, 1)}
              </span>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#1f1f1f] text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {DOW_LABELS[d.dow]}: {d.count.toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
