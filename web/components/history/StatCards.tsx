'use client'

import type { HistoryStats } from '@/lib/types'

interface Props {
  stats: HistoryStats
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function msToHours(ms: number): string {
  const h = ms / 1000 / 3600
  return h >= 1000 ? `${fmt(Math.round(h / 1000), 1)}k` : fmt(Math.round(h))
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

export function StatCards({ stats }: Props) {
  const skipPct = stats.total_plays > 0
    ? ((stats.skipped_count / stats.total_plays) * 100).toFixed(1)
    : '0'
  const shufflePct = stats.total_plays > 0
    ? ((stats.shuffle_count / stats.total_plays) * 100).toFixed(1)
    : '0'

  const startYear = stats.first_played_at ? new Date(stats.first_played_at).getFullYear() : null
  const endYear = stats.last_played_at ? new Date(stats.last_played_at).getFullYear() : null
  const yearSpan = startYear && endYear && startYear !== endYear
    ? `${startYear} – ${endYear}`
    : startYear?.toString()

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card
        label="Listening time"
        value={`${msToHours(stats.total_ms)}h`}
        sub={`${Math.round(stats.total_ms / 1000 / 3600 / 24)} days total${yearSpan ? ` · ${yearSpan}` : ''}`}
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
        label="Skip rate"
        value={`${skipPct}%`}
        sub={`${shufflePct}% on shuffle`}
      />
    </div>
  )
}
