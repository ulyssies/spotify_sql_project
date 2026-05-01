'use client'

import type { YearStat } from '@/lib/types'

interface Props {
  data: YearStat[]
  metric: 'plays' | 'hours'
}

export function YearlyChart({ data, metric }: Props) {
  if (!data.length) return null

  const values = data.map((d) =>
    metric === 'hours' ? Math.round(d.total_ms / 3_600_000) : d.plays,
  )
  const maxVal = Math.max(...values)

  return (
    <div className="bg-[#111111] rounded-xl p-5 border border-[#1f1f1f]">
      <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-4">
        {metric === 'hours' ? 'Hours per year' : 'Plays per year'}
      </p>
      <div className="flex items-end gap-2 h-36">
        {data.map((d, i) => {
          const val = values[i]
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
          return (
            <div key={d.year} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full relative flex flex-col justify-end" style={{ height: '112px' }}>
                <div
                  className="w-full rounded-t-sm bg-[#1DB954] opacity-70 group-hover:opacity-100 transition-opacity relative"
                  style={{ height: `${pct}%`, minHeight: pct > 0 ? 2 : 0 }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-[#666] group-hover:text-white transition-colors whitespace-nowrap hidden group-hover:block">
                    {metric === 'hours' ? `${val}h` : val.toLocaleString()}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-[#555] group-hover:text-[#888] transition-colors">
                {d.year}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
