'use client'

import { useMemo } from 'react'
import type { HeatmapDay } from '@/lib/types'

interface Props {
  data: HeatmapDay[]
  year: number
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function intensity(count: number, max: number): string {
  if (count === 0 || max === 0) return '#1a1a1a'
  const t = count / max
  if (t < 0.15) return '#0d3320'
  if (t < 0.35) return '#135c33'
  if (t < 0.6)  return '#1a8a44'
  if (t < 0.8)  return '#1DB954'
  return '#39e878'
}

export function HeatmapCalendar({ data, year }: Props) {
  const { weeks, monthLabels, maxCount } = useMemo(() => {
    const countMap = new Map(data.map((d) => [d.day, d.count]))
    const max = Math.max(...data.map((d) => d.count), 1)

    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31)

    // Pad to start of week
    const firstDay = new Date(start)
    firstDay.setDate(firstDay.getDate() - firstDay.getDay())

    const days: { date: string; count: number; inYear: boolean }[] = []
    const cursor = new Date(firstDay)
    while (cursor <= end || cursor.getDay() !== 0) {
      const iso = cursor.toISOString().slice(0, 10)
      days.push({
        date: iso,
        count: countMap.get(iso) ?? 0,
        inYear: cursor.getFullYear() === year,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    // Group into weeks (columns of 7)
    const wks: typeof days[] = []
    for (let i = 0; i < days.length; i += 7) {
      wks.push(days.slice(i, i + 7))
    }

    // Month labels: first week where the month changes
    const labels: { month: string; col: number }[] = []
    let lastMonth = -1
    wks.forEach((wk, col) => {
      const firstInYear = wk.find((d) => d.inYear)
      if (firstInYear) {
        const m = new Date(firstInYear.date).getMonth()
        if (m !== lastMonth) {
          labels.push({ month: MONTHS[m], col })
          lastMonth = m
        }
      }
    })

    return { weeks: wks, monthLabels: labels, maxCount: max }
  }, [data, year])

  const CELL = 11
  const GAP = 2

  return (
    <div className="bg-[#111111] rounded-xl p-5 border border-[#1f1f1f] overflow-x-auto">
      <p className="text-[#666] text-xs font-medium uppercase tracking-wider mb-4">
        Listening calendar · {year}
      </p>
      <div className="flex gap-2">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] pt-5">
          {DAYS.map((d, i) => (
            <div
              key={d}
              style={{ height: CELL, fontSize: 9 }}
              className="text-[#444] flex items-center"
            >
              {i % 2 === 1 ? d.slice(0, 1) : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div>
          {/* Month labels */}
          <div className="flex mb-[2px]" style={{ gap: GAP }}>
            {(() => {
              const els: React.ReactNode[] = []
              let col = 0
              monthLabels.forEach(({ month, col: labelCol }, idx) => {
                const gap = labelCol - col
                if (gap > 0) {
                  els.push(
                    <div
                      key={`gap-${idx}`}
                      style={{ width: gap * (CELL + GAP) - GAP }}
                    />,
                  )
                }
                els.push(
                  <div
                    key={month + labelCol}
                    className="text-[#555] shrink-0"
                    style={{ fontSize: 9, width: CELL }}
                  >
                    {month}
                  </div>,
                )
                col = labelCol + 1
              })
              return els
            })()}
          </div>

          {/* Cells */}
          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={day.inYear ? `${day.date}: ${day.count} plays` : ''}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 2,
                      backgroundColor: day.inYear ? intensity(day.count, maxCount) : 'transparent',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3">
        <span className="text-[#444] text-[10px]">Less</span>
        {['#1a1a1a', '#0d3320', '#135c33', '#1a8a44', '#1DB954', '#39e878'].map((c) => (
          <div key={c} style={{ width: CELL, height: CELL, borderRadius: 2, backgroundColor: c }} />
        ))}
        <span className="text-[#444] text-[10px]">More</span>
      </div>
    </div>
  )
}
