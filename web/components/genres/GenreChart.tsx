'use client'

import { useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
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

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: Genre; value: number }>
}) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload

  return (
    <div
      style={{
        background: '#111111',
        border: '1px solid #1f1f1f',
        borderRadius: 8,
        padding: '10px 14px',
        maxWidth: 260,
        fontFamily: 'var(--font-dm-sans)',
        fontSize: 13,
      }}
    >
      <p style={{ color: '#f5f5f5' }}>
        {entry.genre} — {entry.percentage}% of your listening
      </p>
    </div>
  )
}

interface GenreChartProps {
  data: Genre[]
}

export function GenreChart({ data }: GenreChartProps) {
  const [otherExpanded, setOtherExpanded] = useState(false)

  const other = data.find((g) => g.other_genres)
  const named = data.filter((g) => !g.other_genres)

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={Math.max(240, named.length * 48)}>
        <BarChart
          data={named}
          layout="vertical"
          margin={{ top: 0, right: 56, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, 'dataMax']}
            tickFormatter={(v: number) => `${Math.round(v)}%`}
            tick={{ fill: '#666666', fontSize: 11, fontFamily: 'var(--font-dm-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="genre"
            width={160}
            tick={{ fill: '#f5f5f5', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            content={<CustomTooltip />}
          />
          <Bar
            dataKey="percentage"
            radius={[0, 4, 4, 0]}
            animationBegin={0}
            animationDuration={700}
            label={{
              position: 'right',
              formatter: (v: number) => `${v.toFixed(1)}%`,
              fill: '#666666',
              fontSize: 11,
              fontFamily: 'var(--font-dm-mono)',
            }}
          >
            {named.map((entry) => (
              <Cell
                key={entry.genre}
                fill={getGenreColor(entry.genre)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {other && (
        <div className="mt-4 border-t border-border/40 pt-4">
          <button
            onClick={() => setOtherExpanded((v) => !v)}
            className="flex items-center justify-between w-full text-left group"
          >
            <span className="text-sm text-muted font-mono">
              {other.other_genres!.length} more genres — {other.percentage.toFixed(1)}% of listening
            </span>
            <span className="text-muted text-xs group-hover:text-primary transition-colors">
              {otherExpanded ? '▲ hide' : '▼ show'}
            </span>
          </button>

          {otherExpanded && (
            <div className="mt-3 flex flex-wrap gap-2">
              {other.other_genres!.map((g) => (
                <span
                  key={g}
                  className="px-2 py-1 rounded-md text-xs font-mono text-muted bg-white/5 border border-border/40"
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
