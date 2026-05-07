'use client'

import type { MonthStat } from '@/lib/types'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface Props {
  data: MonthStat[]
  metric: 'plays' | 'hours'
  year: number
}

export function MonthlyChart({ data, metric, year }: Props) {
  const filled = MONTH_LABELS.map((label, index) => {
    const month = index + 1
    const row = data.find((d) => Number(d.month) === month)
    return {
      month,
      label,
      plays: row?.plays ?? 0,
      total_ms: row?.total_ms ?? 0,
    }
  })
  const values = filled.map((d) =>
    metric === 'hours' ? Math.round(d.total_ms / 3_600_000) : d.plays,
  )
  const maxVal = Math.max(...values, 1)

  return (
    <div className="bg-[#111111] rounded-xl p-5 border border-[#1f1f1f]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[#666] text-xs font-medium uppercase tracking-wider">
          {metric === 'hours' ? 'Hours per month' : 'Plays per month'}
        </p>
        <span className="font-mono text-[10px] text-[#555]">{year}</span>
      </div>
      <div className="flex items-end gap-2 h-36">
        {filled.map((d, i) => {
          const val = values[i]
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group">
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
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
