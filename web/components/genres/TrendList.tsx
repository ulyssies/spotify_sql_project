import type { Genre } from '@/lib/types'

interface TrendListProps {
  current: Genre[]
  allTime: Genre[]
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

  return (
    <div className="space-y-2">
      {items.map(({ genre, current: cur, delta }) => {
        const isUp = delta > 0.5
        const isDown = delta < -0.5
        return (
          <div key={genre} className="flex items-center justify-between py-2 border-b border-border/60">
            <span className="text-sm text-primary">{genre}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted">{cur.toFixed(1)}%</span>
              {isUp && (
                <span className="font-mono text-xs text-emerald-400">
                  ▲ {delta.toFixed(1)}%
                </span>
              )}
              {isDown && (
                <span className="font-mono text-xs text-red-400">
                  ▼ {Math.abs(delta).toFixed(1)}%
                </span>
              )}
              {!isUp && !isDown && (
                <span className="font-mono text-xs text-muted">—</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
