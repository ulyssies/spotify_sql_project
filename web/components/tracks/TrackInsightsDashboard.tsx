'use client'

import type { Genre, Track } from '@/lib/types'

interface TrackInsightsDashboardProps {
  tracks: Track[]
  genres?: Genre[]
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
  if (g.includes('dream') || g.includes('shoegaze') || g.includes('slowcore')) return '#2dd4bf'
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

function getWeightMode(tracks: Track[]): WeightMode {
  if (tracks.some((track) => (track.minutes_played ?? 0) > 0)) return 'minutes'
  if (tracks.some((track) => (track.play_count ?? 0) > 0)) return 'plays'
  return 'rank'
}

function getTrackWeight(track: Track, mode: WeightMode, totalTracks: number): number {
  if (mode === 'minutes') return track.minutes_played ?? 0
  if (mode === 'plays') return track.play_count ?? 0
  return Math.max(1, totalTracks - track.rank + 1)
}

function InsightCard({
  title,
  label,
  children,
  className = '',
}: {
  title: string
  label?: string
  children: React.ReactNode
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

function buildArtistShare(tracks: Track[], mode: WeightMode): WeightedItem[] {
  const totals = new Map<string, number>()
  tracks.forEach((track) => {
    totals.set(track.artist_name, (totals.get(track.artist_name) ?? 0) + getTrackWeight(track, mode, tracks.length))
  })

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function buildGenreMix(tracks: Track[], genres: Genre[] | undefined, mode: WeightMode): WeightedItem[] {
  const namedGenres = (genres ?? [])
    .filter((genre) => !genre.other_genres)
    .slice(0, 7)
    .map((genre) => ({
      label: genre.genre,
      value: genre.percentage,
      valueLabel: `${genre.percentage.toFixed(1)}%`,
      color: getGenreColor(genre.genre),
    }))

  if (namedGenres.length) return namedGenres

  const totals = new Map<string, number>()
  tracks.forEach((track) => {
    const weight = getTrackWeight(track, mode, tracks.length)
    ;(track.genres ?? []).forEach((genre) => {
      totals.set(genre, (totals.get(genre) ?? 0) + weight)
    })
  })

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value, valueLabel: formatWeight(value, mode), color: getGenreColor(label) }))
    .sort((a, b) => b.value - a.value)
}

function buildFirstListened(tracks: Track[]): WeightedItem[] {
  const totals = new Map<string, number>()
  tracks.forEach((track) => {
    if (!track.first_listened) return
    const date = new Date(track.first_listened)
    if (Number.isNaN(date.getTime())) return
    const label = date.getFullYear().toString()
    totals.set(label, (totals.get(label) ?? 0) + 1)
  })

  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value, valueLabel: `${value} tracks` }))
    .sort((a, b) => Number(a.label) - Number(b.label))
}

function buildPopularityBuckets(tracks: Track[]): WeightedItem[] {
  const buckets = [
    { label: 'Hidden', min: 0, max: 39, value: 0 },
    { label: 'Known', min: 40, max: 69, value: 0 },
    { label: 'Big', min: 70, max: 100, value: 0 },
  ]

  tracks.forEach((track) => {
    if (track.popularity == null) return
    const bucket = buckets.find((entry) => track.popularity! >= entry.min && track.popularity! <= entry.max)
    if (bucket) bucket.value += 1
  })

  return buckets
    .filter((bucket) => bucket.value > 0)
    .map((bucket) => ({ ...bucket, valueLabel: `${bucket.value} tracks` }))
}

export function TrackInsightsDashboard({ tracks, genres, rangeLabel }: TrackInsightsDashboardProps) {
  if (!tracks.length) return null

  const mode = getWeightMode(tracks)
  const totalWeight = tracks.reduce((sum, track) => sum + getTrackWeight(track, mode, tracks.length), 0)
  const exactMinutes = tracks.reduce((sum, track) => sum + (track.minutes_played ?? 0), 0)
  const totalPlays = tracks.reduce((sum, track) => sum + (track.play_count ?? 0), 0)
  const uniqueArtists = new Set(tracks.map((track) => track.artist_name)).size
  const coverage = tracks.filter((track) => (track.minutes_played ?? 0) > 0 || (track.play_count ?? 0) > 0).length
  const topWeightedTracks = [...tracks]
    .map((track) => ({
      label: track.track_name,
      sublabel: track.artist_name,
      value: getTrackWeight(track, mode, tracks.length),
    }))
    .sort((a, b) => b.value - a.value)
  const topFiveShare = totalWeight > 0
    ? (topWeightedTracks.slice(0, 5).reduce((sum, item) => sum + item.value, 0) / totalWeight) * 100
    : 0
  const genreMix = buildGenreMix(tracks, genres, mode)
  const topGenre = genreMix[0]
  const artistShare = buildArtistShare(tracks, mode)
  const firstListened = buildFirstListened(tracks)
  const popularityBuckets = buildPopularityBuckets(tracks)

  return (
    <div className="mt-10">
      <div className="mb-5">
        <h2 className="font-syne text-2xl font-bold text-white">Track insights</h2>
        <p className="mt-1 text-sm font-semibold text-[#8a8a8a]">
          A working dashboard from your current top 50 and imported listening history.
        </p>
      </div>

      <div className="grid auto-rows-[minmax(132px,auto)] grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
        <MetricCard
          label="Listening time"
          value={exactMinutes > 0 ? formatMinutes(exactMinutes) : mode === 'plays' ? `${formatNumber(totalPlays)} plays` : `${tracks.length} tracks`}
          note={exactMinutes > 0 ? `Matched across your top tracks from ${rangeLabel}.` : 'Exact minutes appear after imported history matches these tracks.'}
          className="md:col-span-3 xl:col-span-3"
        />

        <MetricCard
          label="Top genre"
          value={topGenre?.label ?? 'Unknown'}
          note={topGenre ? `${topGenre.value.toFixed(mode === 'minutes' ? 0 : 1)}${genres?.length ? '% of genre mix' : ` ${mode}`}` : 'Genre data is still syncing for these tracks.'}
          className="md:col-span-3 xl:col-span-3"
        />

        <MetricCard
          label="Replay concentration"
          value={`${topFiveShare.toFixed(0)}%`}
          note="Share held by the top 5 tracks in this row."
          className="md:col-span-3 xl:col-span-3"
        />

        <MetricCard
          label="Artist spread"
          value={`${uniqueArtists}`}
          note={`${tracks.length} tracks across ${uniqueArtists} artists.`}
          className="md:col-span-3 xl:col-span-3"
        />

        <InsightCard title="Listening weight" label={mode} className="md:col-span-6 xl:col-span-7">
          <BarList items={topWeightedTracks} mode={mode} maxItems={8} />
        </InsightCard>

        <InsightCard title="Genre mix" label={genres?.length ? 'weighted' : mode} className="md:col-span-6 xl:col-span-5">
          {genreMix.length ? (
            <BarList items={genreMix} mode={genres?.length ? 'rank' : mode} maxItems={7} />
          ) : (
            <p className="text-sm font-semibold text-[#777]">No genre tags are attached to these tracks yet.</p>
          )}
        </InsightCard>

        <InsightCard title="Artist share" label={mode} className="md:col-span-3 xl:col-span-4">
          <BarList items={artistShare} mode={mode} maxItems={6} />
        </InsightCard>

        <InsightCard title="First heard" label="history" className="md:col-span-3 xl:col-span-4">
          {firstListened.length ? (
            <BarList items={firstListened} mode="rank" maxItems={8} />
          ) : (
            <p className="text-sm font-semibold leading-relaxed text-[#777]">
              Import history can turn this into a year-by-year view of when your current favorites first appeared.
            </p>
          )}
        </InsightCard>

        <InsightCard title="Popularity shape" label="spotify" className="md:col-span-6 xl:col-span-4">
          {popularityBuckets.length ? (
            <BarList items={popularityBuckets} mode="rank" maxItems={3} />
          ) : (
            <p className="text-sm font-semibold text-[#777]">Popularity scores are not available for this row yet.</p>
          )}
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#777]">Data coverage</p>
            <p className="mt-1 text-sm font-semibold text-[#b5b5b5]">
              {coverage}/{tracks.length} tracks have imported play or minute matches.
            </p>
          </div>
        </InsightCard>
      </div>
    </div>
  )
}
