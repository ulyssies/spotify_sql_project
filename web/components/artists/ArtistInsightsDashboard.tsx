'use client'

import { useMemo, type ReactNode } from 'react'
import { useHistoryArtistYearly, useHistoryTopArtists } from '@/hooks/useHistoryData'
import type { Artist, ArtistYearStat, TopArtist } from '@/lib/types'

interface ArtistInsightsDashboardProps {
  artists: Artist[]
  rangeLabel: string
}

type WeightMode = 'minutes' | 'plays' | 'rank'

interface WeightedItem {
  label: string
  sublabel?: string
  value: number
  valueLabel?: string
  color?: string
}

const ARTIST_COLORS = ['#ef4444', '#f59e0b', '#f472b6', '#818cf8', '#60a5fa', '#2dd4bf', '#a78bfa', '#84cc16']

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

function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m'
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = minutes / 60
  return hours >= 100 ? `${Math.round(hours)}h` : `${hours.toFixed(hours >= 10 ? 0 : 1)}h`
}

function formatWeight(value: number, mode: WeightMode): string {
  if (mode === 'minutes') return formatMinutes(value)
  if (mode === 'plays') return `${formatNumber(value)} plays`
  return `${formatNumber(value)} pts`
}

function getWeightMode(artists: Artist[]): WeightMode {
  if (artists.some((artist) => (artist.total_minutes ?? 0) > 0)) return 'minutes'
  if (artists.some((artist) => (artist.total_plays ?? 0) > 0)) return 'plays'
  return 'rank'
}

function getArtistWeight(artist: Artist, mode: WeightMode, totalArtists: number): number {
  if (mode === 'minutes') return artist.total_minutes ?? 0
  if (mode === 'plays') return artist.total_plays ?? 0
  return Math.max(1, totalArtists - artist.rank + 1)
}

function InsightCard({
  title,
  label,
  children,
  className = '',
}: {
  title: string
  label?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-white/[0.08] bg-[#101010] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="font-syne text-lg font-bold leading-none text-white">{title}</h2>
        {label && (
          <span className="rounded-full border border-white/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#777]">
            {label}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function MetricCard({
  label,
  value,
  note,
  className = '',
}: {
  label: string
  value: string
  note?: string
  className?: string
}) {
  return (
    <InsightCard title={label} className={className}>
      <p className="font-syne text-3xl font-bold leading-none text-[#1DB954]">{value}</p>
      {note && <p className="mt-2 text-sm font-semibold leading-snug text-[#8a8a8a]">{note}</p>}
    </InsightCard>
  )
}

function BarList({
  items,
  mode,
  maxItems = 6,
}: {
  items: WeightedItem[]
  mode: WeightMode
  maxItems?: number
}) {
  const visible = items.slice(0, maxItems)
  const max = Math.max(...visible.map((item) => item.value), 1)

  return (
    <div className="space-y-3">
      {visible.map((item, index) => {
        const width = Math.max(5, (item.value / max) * 100)
        return (
          <div key={`${item.label}-${index}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-bold text-white">{item.label}</span>
              <span className="shrink-0 font-mono text-[#777]">{item.valueLabel ?? formatWeight(item.value, mode)}</span>
            </div>
            {item.sublabel && <p className="mb-1 truncate text-[11px] font-semibold text-[#666]">{item.sublabel}</p>}
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${width}%`,
                  background: item.color ?? 'linear-gradient(90deg, #1DB954, #52e78a)',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function buildCurrentWeights(artists: Artist[], mode: WeightMode): WeightedItem[] {
  return [...artists]
    .map((artist) => ({
      label: artist.artist_name,
      sublabel: artist.genres?.slice(0, 2).join(', '),
      value: getArtistWeight(artist, mode, artists.length),
    }))
    .sort((a, b) => b.value - a.value)
}

function buildGenreLanes(artists: Artist[], mode: WeightMode): WeightedItem[] {
  const totals = new Map<string, number>()
  artists.forEach((artist) => {
    const weight = getArtistWeight(artist, mode, artists.length)
    ;(artist.genres ?? []).slice(0, 3).forEach((genre) => {
      totals.set(genre, (totals.get(genre) ?? 0) + weight)
    })
  })

  return Array.from(totals.entries())
    .map(([label, value]) => ({
      label,
      value,
      valueLabel: formatWeight(value, mode),
      color: getGenreColor(label),
    }))
    .sort((a, b) => b.value - a.value)
}

function buildAudienceBuckets(artists: Artist[]): WeightedItem[] {
  const buckets = [
    { label: 'Niche', value: 0, min: 0, max: 250_000 },
    { label: 'Breakout', value: 0, min: 250_000, max: 2_000_000 },
    { label: 'Established', value: 0, min: 2_000_000, max: 10_000_000 },
    { label: 'Global', value: 0, min: 10_000_000, max: Number.POSITIVE_INFINITY },
  ]

  artists.forEach((artist) => {
    if (artist.followers == null) return
    const bucket = buckets.find((item) => artist.followers! >= item.min && artist.followers! < item.max)
    if (bucket) bucket.value += 1
  })

  return buckets
    .filter((bucket) => bucket.value > 0)
    .map((bucket) => ({ label: bucket.label, value: bucket.value, valueLabel: `${bucket.value} artists` }))
}

function buildAllTimeOverlap(artists: Artist[], allTimeArtists?: TopArtist[]): WeightedItem[] {
  if (!allTimeArtists?.length) return []

  const currentNames = new Set(artists.map((artist) => artist.artist_name.toLowerCase()))
  return allTimeArtists
    .filter((artist) => currentNames.has(artist.artist_name.toLowerCase()))
    .map((artist, index) => ({
      label: artist.artist_name,
      sublabel: `${formatNumber(artist.plays)} plays`,
      value: artist.total_ms / 60000,
      valueLabel: formatMinutes(artist.total_ms / 60000),
      color: ARTIST_COLORS[index % ARTIST_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)
}

function ArtistYearlyChart({
  data,
  artistNames,
}: {
  data?: ArtistYearStat[]
  artistNames: string[]
}) {
  if (!data?.length) {
    return (
      <p className="text-sm font-semibold leading-relaxed text-[#777]">
        Import listening history to see how these artists rise and fade across years.
      </p>
    )
  }

  const years = Array.from(new Set(data.map((row) => row.year))).sort((a, b) => a - b)
  const orderedNames = artistNames.filter((name) => data.some((row) => row.artist_name.toLowerCase() === name.toLowerCase()))
  const max = Math.max(...data.map((row) => row.total_ms), 1)
  const byArtistYear = new Map<string, ArtistYearStat>()
  data.forEach((row) => byArtistYear.set(`${row.artist_name.toLowerCase()}-${row.year}`, row))

  return (
    <div className="space-y-3">
      {orderedNames.slice(0, 6).map((artistName, artistIndex) => (
        <div key={artistName} className="grid grid-cols-[92px_1fr] items-end gap-3">
          <div>
            <p className="truncate text-xs font-bold text-white">{artistName}</p>
            <p className="font-mono text-[10px] text-[#666]">#{artistIndex + 1}</p>
          </div>
          <div
            className="grid h-12 items-end gap-1"
            style={{ gridTemplateColumns: `repeat(${years.length}, minmax(12px, 1fr))` }}
          >
            {years.map((year) => {
              const row = byArtistYear.get(`${artistName.toLowerCase()}-${year}`)
              const height = row ? Math.max(8, (row.total_ms / max) * 48) : 2
              return (
                <div key={year} className="flex h-12 items-end rounded-full bg-white/[0.03]">
                  <div
                    className="w-full rounded-full"
                    style={{
                      height,
                      background: row ? ARTIST_COLORS[artistIndex % ARTIST_COLORS.length] : 'rgba(255,255,255,0.05)',
                    }}
                    title={row ? `${artistName}: ${formatMinutes(row.total_ms / 60000)} in ${year}` : `${artistName}: no plays in ${year}`}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div className="ml-[104px] grid gap-1" style={{ gridTemplateColumns: `repeat(${years.length}, minmax(12px, 1fr))` }}>
        {years.map((year) => (
          <span key={year} className="text-center font-mono text-[9px] text-[#666]">
            {String(year).slice(2)}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ArtistInsightsDashboard({ artists, rangeLabel }: ArtistInsightsDashboardProps) {
  const mode = getWeightMode(artists)
  const yearlyNames = useMemo(() => artists.slice(0, 8).map((artist) => artist.artist_name), [artists])
  const { data: allTimeArtists } = useHistoryTopArtists(undefined, 50)
  const { data: artistYearly } = useHistoryArtistYearly(yearlyNames, 8)

  if (!artists.length) return null

  const currentWeights = buildCurrentWeights(artists, mode)
  const genreLanes = buildGenreLanes(artists, mode)
  const audienceBuckets = buildAudienceBuckets(artists)
  const allTimeOverlap = buildAllTimeOverlap(artists, allTimeArtists)
  const totalWeight = currentWeights.reduce((sum, item) => sum + item.value, 0)
  const topFiveShare = totalWeight > 0
    ? (currentWeights.slice(0, 5).reduce((sum, item) => sum + item.value, 0) / totalWeight) * 100
    : 0
  const coverage = artists.filter((artist) => (artist.total_minutes ?? 0) > 0 || (artist.total_plays ?? 0) > 0).length
  const topArtist = currentWeights[0]
  const topLane = genreLanes[0]
  const allTimeRanks = new Map((allTimeArtists ?? []).map((artist, index) => [artist.artist_name.toLowerCase(), index + 1]))
  const currentInAllTimeTop50 = artists.filter((artist) => allTimeRanks.has(artist.artist_name.toLowerCase())).length
  const freshestArtist = artists.find((artist) => !allTimeRanks.has(artist.artist_name.toLowerCase())) ?? artists[artists.length - 1]

  return (
    <div className="mt-10">
      <div className="mb-5">
        <h2 className="font-syne text-2xl font-bold text-white">Artist insights</h2>
        <p className="mt-1 text-sm font-semibold text-[#8a8a8a]">
          A dashboard for who is carrying your listening, where they fit, and how they show up over time.
        </p>
      </div>

      <div className="grid auto-rows-[minmax(132px,auto)] grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
        <MetricCard
          label="Listening weight"
          value={mode === 'minutes' ? formatMinutes(totalWeight) : mode === 'plays' ? `${formatNumber(totalWeight)} plays` : `${artists.length} artists`}
          note={mode === 'minutes' || mode === 'plays' ? `Matched across your top artists from ${rangeLabel}.` : 'Import history will turn this from rank weight into real listening time.'}
          className="md:col-span-3 xl:col-span-3"
        />

        <MetricCard
          label="Artist leader"
          value={topArtist?.label ?? 'Unknown'}
          note={topArtist ? `${formatWeight(topArtist.value, mode)} leads this range.` : undefined}
          className="md:col-span-3 xl:col-span-3"
        />

        <MetricCard
          label="Main lane"
          value={topLane?.label ?? 'Unknown'}
          note={topLane ? `${formatWeight(topLane.value, mode)} across top artist tags.` : 'Artist genre tags are still syncing.'}
          className="md:col-span-3 xl:col-span-3"
        />

        <MetricCard
          label="Top 5 pull"
          value={`${topFiveShare.toFixed(0)}%`}
          note="How concentrated this page is around the first five artists."
          className="md:col-span-3 xl:col-span-3"
        />

        <InsightCard title="Top artists over time" label="history" className="md:col-span-6 xl:col-span-7">
          <ArtistYearlyChart data={artistYearly} artistNames={yearlyNames} />
        </InsightCard>

        <InsightCard title="Current listening weight" label={mode} className="md:col-span-6 xl:col-span-5">
          <BarList items={currentWeights} mode={mode} maxItems={8} />
        </InsightCard>

        <InsightCard title="Genre lanes" label={mode} className="md:col-span-3 xl:col-span-4">
          {genreLanes.length ? (
            <BarList items={genreLanes} mode={mode} maxItems={7} />
          ) : (
            <p className="text-sm font-semibold text-[#777]">No genre tags are attached to these artists yet.</p>
          )}
        </InsightCard>

        <InsightCard title="All-time overlap" label="memory" className="md:col-span-3 xl:col-span-4">
          {allTimeOverlap.length ? (
            <BarList items={allTimeOverlap} mode="minutes" maxItems={6} />
          ) : (
            <p className="text-sm font-semibold leading-relaxed text-[#777]">
              Import history to compare today&apos;s top artists against your all-time leaders.
            </p>
          )}
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#777]">Top 50 memory</p>
            <p className="mt-1 text-sm font-semibold text-[#b5b5b5]">
              {currentInAllTimeTop50}/{artists.length} current artists appear in your all-time top 50.
            </p>
          </div>
        </InsightCard>

        <InsightCard title="Audience shape" label="spotify" className="md:col-span-3 xl:col-span-4">
          {audienceBuckets.length ? (
            <BarList items={audienceBuckets} mode="rank" maxItems={4} />
          ) : (
            <p className="text-sm font-semibold text-[#777]">Follower counts are not available for this row yet.</p>
          )}
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#777]">Fresh signal</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#b5b5b5]">
              {freshestArtist ? `${freshestArtist.artist_name} is the least anchored to your all-time list.` : 'No fresh artist signal yet.'}
            </p>
          </div>
        </InsightCard>

        <InsightCard title="Data coverage" label="quality" className="md:col-span-3 xl:col-span-4">
          <p className="font-syne text-3xl font-bold leading-none text-[#1DB954]">
            {coverage}/{artists.length}
          </p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#8a8a8a]">
            Artists with imported play or minute matches. More coverage makes these cards shift from Spotify rank to true listening behavior.
          </p>
        </InsightCard>
      </div>
    </div>
  )
}
