'use client'

import { useState } from 'react'
import { StatCards } from '@/components/history/StatCards'
import { YearlyChart } from '@/components/history/YearlyChart'
import { MonthlyChart } from '@/components/history/MonthlyChart'
import { HeatmapCalendar } from '@/components/history/HeatmapCalendar'
import { TopArtistsList, TopTracksList } from '@/components/history/TopList'
import { HourPatternChart, DowPatternChart } from '@/components/history/PatternsChart'
import { Skeleton } from '@/components/ui/Skeleton'
import type { HistoryStats, YearStat } from '@/lib/types'
import {
  useHistoryStats,
  useHistoryYearly,
  useHistoryMonthly,
  useHistoryHeatmap,
  useHistoryPatterns,
  useHistoryTopArtists,
  useHistoryTopTracks,
} from '@/hooks/useHistoryData'

const ALL_TIME = 0

function statsFromYear(row: YearStat): HistoryStats {
  return {
    total_plays: row.plays,
    total_ms: row.total_ms,
    unique_artists: row.unique_artists,
    unique_tracks: row.unique_tracks,
    skipped_count: 0,
    shuffle_count: 0,
    skip_data_count: 0,
    shuffle_data_count: 0,
    meaningful_plays: row.plays,
    first_played_at: `${row.year}-01-01T00:00:00Z`,
    last_played_at: `${row.year}-12-31T23:59:59Z`,
  }
}

function LoadingSection({ rows = 1 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  )
}

export default function HistoryPage() {
  const [selectedYear, setSelectedYear] = useState<number>(ALL_TIME)

  const year = selectedYear === ALL_TIME ? undefined : selectedYear

  const { data: stats, isLoading: statsLoading } = useHistoryStats(year)
  const { data: yearly, isLoading: yearlyLoading } = useHistoryYearly()
  const { data: monthly, isLoading: monthlyLoading } = useHistoryMonthly(year)
  const { data: heatmap, isLoading: heatmapLoading } = useHistoryHeatmap(year)
  const { data: patterns, isLoading: patternsLoading } = useHistoryPatterns()
  const { data: topArtists, isLoading: artistsLoading } = useHistoryTopArtists(year, 25)
  const { data: topTracks, isLoading: tracksLoading } = useHistoryTopTracks(year, 25)

  const years = yearly ? yearly.map((y) => y.year).sort((a, b) => b - a) : []
  const fallbackStats = year && yearly
    ? yearly.find((y) => y.year === year)
    : undefined
  const displayStats = stats ?? (fallbackStats ? statsFromYear(fallbackStats) : undefined)
  const heatmapYear = selectedYear === ALL_TIME
    ? new Date().getFullYear()
    : selectedYear

  const noData = !statsLoading && displayStats && displayStats.total_plays === 0

  return (
    <div className="space-y-6 pb-8">
      {/* Header + year selector */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-syne font-bold text-xl text-primary">Listening History</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedYear(ALL_TIME)}
            className={[
              'px-2 py-1 rounded-full text-sm font-medium transition-colors',
              selectedYear === ALL_TIME
                ? 'bg-[#1DB954] text-black'
                : 'bg-[#1f1f1f] text-[#666] hover:text-white hover:bg-[#2a2a2a]',
            ].join(' ')}
          >
            All Time
          </button>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setSelectedYear(y)}
              className={[
                'px-2 py-1 rounded-full text-sm font-medium transition-colors',
                selectedYear === y
                  ? 'bg-[#1DB954] text-black'
                  : 'bg-[#1f1f1f] text-[#666] hover:text-white hover:bg-[#2a2a2a]',
              ].join(' ')}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {noData ? (
        <div className="text-center py-20">
          <p className="text-muted text-sm mb-2">No listening history found.</p>
          <p className="text-[#555] text-xs">
            Run <code className="bg-[#1f1f1f] px-1 py-0.5 rounded">python api/scripts/import_history.py</code> to import your Spotify history.
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          {statsLoading && !displayStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : !displayStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
                  <p className="text-[#666] text-xs font-medium uppercase tracking-wider">No data</p>
                </div>
              ))}
            </div>
          ) : (
            <StatCards stats={displayStats} year={year} />
          )}

          {/* Timeline chart */}
          {selectedYear === ALL_TIME ? (
            yearlyLoading || !yearly ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : (
              <YearlyChart data={yearly} metric="hours" />
            )
          ) : (
            monthlyLoading || !monthly || !year ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : (
              <MonthlyChart data={monthly} metric="hours" year={year} />
            )
          )}

          {/* Top artists + tracks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {artistsLoading || !topArtists ? (
              <LoadingSection rows={8} />
            ) : (
              <TopArtistsList data={topArtists} />
            )}
            {tracksLoading || !topTracks ? (
              <LoadingSection rows={8} />
            ) : (
              <TopTracksList data={topTracks} />
            )}
          </div>

          {/* Listening calendar */}
          {heatmapLoading || !heatmap ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <HeatmapCalendar data={heatmap} year={heatmapYear} />
          )}

          {/* Hour + day-of-week patterns (all-time only) */}
          {selectedYear === ALL_TIME && (
            patternsLoading || !patterns ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-36 rounded-xl" />
                <Skeleton className="h-36 rounded-xl" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <HourPatternChart data={patterns.hours} />
                <DowPatternChart data={patterns.dow} />
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}
