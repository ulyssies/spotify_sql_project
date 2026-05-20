'use client'

import type { HistoryStats } from '@/lib/types'

interface Props {
  stats: HistoryStats
  year?: number
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function msToHours(ms: number): string {
  const h = ms / 1000 / 3600
  return h >= 1000 ? `${fmt(Math.round(h / 1000), 1)}k` : fmt(Math.round(h))
}

function daysBetweenInclusive(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0

  const diff = Math.max(0, endDate.getTime() - startDate.getTime())
  return Math.max(1, Math.floor(diff / 86_400_000) + 1)
}

function msToDailyAverage(ms: number, days: number): string {
  if (!days || ms <= 0) return '0m'
  const minutes = Math.round(ms / 60_000 / days)
  if (minutes >= 60) {
    const hours = minutes / 60
    return `${fmt(hours, hours >= 10 ? 0 : 1)}h`
  }
  return `${fmt(minutes)}m`
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#111111] rounded-xl p-4 flex flex-col gap-1 border border-[#1f1f1f]">
      <p className="text-[#666] text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="text-white font-syne font-bold text-2xl leading-none">{value}</p>
      {sub && <p className="text-[#555] text-xs">{sub}</p>}
    </div>
  )
}

export function StatCards({ stats, year }: Props) {
  const startYear = stats.first_played_at ? new Date(stats.first_played_at).getFullYear() : null
  const endYear = stats.last_played_at ? new Date(stats.last_played_at).getFullYear() : null
  const yearSpan = startYear && endYear && startYear !== endYear
    ? `${startYear} – ${endYear}`
    : startYear?.toString()
  const dayCount = daysBetweenInclusive(stats.first_played_at, stats.last_played_at)
  const playsPerDay = dayCount ? Math.round(stats.total_plays / dayCount) : 0
  const dailyAverage = msToDailyAverage(stats.total_ms, dayCount)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card
        label="Listening time"
        value={`${msToHours(stats.total_ms)}h`}
        sub={`${Math.round(stats.total_ms / 1000 / 3600 / 24)} days${year ? ` in ${year}` : yearSpan ? ` total · ${yearSpan}` : ' total'}`}
      />
      <Card
        label="Total plays"
        value={fmt(stats.total_plays)}
        sub={`${fmt(stats.meaningful_plays)} full listens`}
      />
      <Card
        label="Artists"
        value={fmt(stats.unique_artists)}
        sub={`${fmt(stats.unique_tracks)} unique tracks`}
      />
      <Card
        label="Daily pace"
        value={`${dailyAverage}/day`}
        sub={dayCount ? `${fmt(playsPerDay)} plays per day${year ? ` in ${year}` : ' on average'}` : 'Import history to unlock your rhythm'}
      />
    </div>
  )
}
