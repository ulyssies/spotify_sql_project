import type { Genre } from '@/lib/types'

interface TrendListProps {
  current: Genre[]
  allTime: Genre[]
}

function getGenreColor(genre: string): string {
  const g = genre.toLowerCase()
  if (g.includes('rap') || g.includes('hip hop') || g.includes('trap') || g.includes('drill')) return '#ef4444'
  if (g.includes('r&b') || g.includes('rnb') || g.includes('soul') || g.includes('funk')) return '#f59e0b'
  if (g.includes('pop')) return '#f472b6'
  if (g.includes('rock') || g.includes('metal') || g.includes('punk') || g.includes('garage')) return '#60a5fa'
  if (g.includes('indie') || g.includes('alternative') || g.includes('alt')) return '#818cf8'
  if (g.includes('electronic') || g.includes('house') || g.includes('techno') || g.includes('synth')) return '#22d3ee'
  if (g.includes('folk') || g.includes('country')) return '#84cc16'
  if (g.includes('jazz') || g.includes('blues')) return '#a78bfa'
  return '#9ca3af'
}

export function TrendList({ current, allTime }: TrendListProps) {
  const allTimeMap = new Map(allTime.map((g) => [g.genre, g.percentage]))

  const items = current
    .map((g) => ({
      genre: g.genre,
      current: g.percentage,
      allTime: allTimeMap.get(g.genre) ?? 0,
      delta: g.percentage - (allTimeMap.get(g.genre) ?? 0),
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 8)
  const max = Math.max(...items.map((item) => Math.max(item.current, item.allTime)), 1)

  return (
    <div className="rounded-[26px] border border-white/[0.08] bg-[#101010] p-5">
      {items.map(({ genre, current: cur, delta }) => {
        const isUp = delta > 0.5
        const isDown = delta < -0.5
        const color = getGenreColor(genre)
        return (
          <div key={genre} className="border-b border-white/[0.06] py-4 last:border-b-0">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="truncate text-sm font-bold text-white">{genre}</span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-xs text-[#777]">{cur.toFixed(1)}%</span>
                <span className={`font-mono text-xs ${isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-[#777]'}`}>
                  {isUp ? `▲ ${delta.toFixed(1)}%` : isDown ? `▼ ${Math.abs(delta).toFixed(1)}%` : 'steady'}
                </span>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, (cur / max) * 100)}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
