'use client'

import { useState } from 'react'
import type { Genre } from '@/lib/types'

function getGenreColor(genre: string): string {
  const g = genre.toLowerCase()
  if (g.includes('rap') || g.includes('hip hop') || g.includes('trap') || g.includes('drill'))
    return '#ef4444'
  if (g.includes('r&b') || g.includes('soul') || g.includes('funk'))
    return '#f59e0b'
  if (g.includes('pop'))
    return '#f472b6'
  if (g.includes('rock') || g.includes('metal') || g.includes('punk') || g.includes('garage'))
    return '#60a5fa'
  if (g.includes('indie') || g.includes('alternative') || g.includes('alt'))
    return '#818cf8'
  if (g.includes('electronic') || g.includes('house') || g.includes('techno') || g.includes('synth'))
    return '#22d3ee'
  if (g.includes('folk') || g.includes('country'))
    return '#84cc16'
  if (g.includes('jazz') || g.includes('blues'))
    return '#a78bfa'
  if (g.includes('classical') || g.includes('baroque'))
    return '#e879f9'
  if (g.includes('dream') || g.includes('shoegaze') || g.includes('slowcore'))
    return '#2dd4bf'
  return '#6b7280'
}

interface GenreChartProps {
  data: Genre[]
}

export function GenreChart({ data }: GenreChartProps) {
  const [otherExpanded, setOtherExpanded] = useState(false)

  const other = data.find((g) => g.other_genres)
  const named = data.filter((g) => !g.other_genres)
  const topPercentage = Math.max(...named.map((genre) => genre.percentage), 1)

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
        {named.map((entry, index) => {
          const color = getGenreColor(entry.genre)
          const intensity = Math.max(0.26, entry.percentage / topPercentage)

          return (
            <div
              key={entry.genre}
              className="group min-w-0 rounded-lg border border-white/[0.08] bg-[#121212] p-2.5 transition-colors duration-150 hover:border-white/[0.18] hover:bg-[#181818]"
            >
              <div
                className="relative aspect-square overflow-hidden rounded-md"
                style={{
                  background: `radial-gradient(circle at 30% 24%, ${color}cc 0%, ${color}66 ${28 + intensity * 22}%, #101010 72%)`,
                }}
              >
                <div
                  className="absolute inset-0 opacity-70"
                  style={{
                    background: `linear-gradient(135deg, ${color}${Math.round(35 + intensity * 55).toString(16).padStart(2, '0')} 0%, transparent 45%, rgba(255,255,255,0.08) 100%)`,
                  }}
                />
                <div className="absolute left-2 top-2 rounded bg-black/65 px-1.5 py-0.5 font-mono text-xs leading-none text-white">
                  {index + 1}
                </div>
                <div className="absolute inset-x-3 bottom-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/45">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(8, (entry.percentage / topPercentage) * 100)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-[15px] font-bold leading-tight text-white">
                {index + 1}. {entry.genre}
              </p>
              <p className="mt-1 truncate text-sm font-semibold leading-tight text-[#858585]">
                {entry.percentage.toFixed(1)}% of listening
              </p>
            </div>
          )
        })}
      </div>

      {other && (
        <div className="mt-5 rounded-lg border border-white/[0.08] bg-[#121212] p-4">
          <button
            onClick={() => setOtherExpanded((v) => !v)}
            className="group flex w-full items-center justify-between text-left"
          >
            <span className="font-mono text-sm text-muted">
              {other.other_genres!.length} more genres — {other.percentage.toFixed(1)}% of listening
            </span>
            <span className="text-xs text-muted transition-colors group-hover:text-primary">
              {otherExpanded ? '▲ hide' : '▼ show'}
            </span>
          </button>

          {otherExpanded && (
            <div className="mt-3 flex flex-wrap gap-2">
              {other.other_genres!.map((g) => (
                <span
                  key={g}
                  className="rounded-md border border-border/40 bg-white/5 px-2 py-1 font-mono text-xs text-muted"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
