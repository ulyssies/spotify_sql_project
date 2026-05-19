'use client'

import { useMemo, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronRight, Clock3, Play, Share2 } from 'lucide-react'
import { useHistoryArtistTimeline, useHistoryTopArtists } from '@/hooks/useHistoryData'
import type { Artist, ArtistTimelineBucket, TimeRange, TopArtist } from '@/lib/types'

interface ArtistInsightsDashboardProps {
  artists: Artist[]
  range: TimeRange
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

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value)}%`
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

function Artwork({
  src,
  alt,
  shape = 'circle',
  className = '',
}: {
  src?: string | null
  alt: string
  shape?: 'square' | 'circle'
  className?: string
}) {
  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded-2xl'

  return (
    <div className={`relative overflow-hidden bg-white/[0.06] ${rounded} ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 45vw, 320px"
          className={`object-cover ${rounded}`}
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center bg-white/[0.06] text-5xl text-white/20 ${rounded}`}>
          ♪
        </div>
      )}
    </div>
  )
}

function StatFeatureCard({
  eyebrow,
  title,
  imageSrc,
  imageAlt,
  badge,
  className = '',
}: {
  eyebrow: string
  title: string
  imageSrc?: string | null
  imageAlt: string
  badge?: string
  className?: string
}) {
  return (
    <section className={`relative flex min-h-[260px] flex-col overflow-hidden rounded-[24px] bg-[#1f1f1f] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.28)] ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-bold text-[#969696]">{eyebrow}</p>
        <ChevronRight className="h-5 w-5 shrink-0 text-[#a4a4a4]" />
      </div>

      <h3 className="mt-1 line-clamp-2 font-syne text-3xl font-bold leading-[0.95] text-white">
        {title}
      </h3>

      <div className="mt-auto flex items-end justify-between gap-4 pt-7">
        <Artwork
          src={imageSrc}
          alt={imageAlt}
          className="h-32 w-32"
        />
        {badge && (
          <span className="rounded-full bg-[#10391f] px-3 py-1.5 text-sm font-bold text-[#39d66d]">
            {badge}
          </span>
        )}
      </div>
    </section>
  )
}

function TextStoryCard({
  eyebrow,
  title,
  body,
  accent,
  children,
  className = '',
}: {
  eyebrow: string
  title: string
  body: string
  accent: string
  children?: ReactNode
  className?: string
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#171717] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.26)] ${className}`}
      style={{
        background: `radial-gradient(circle at 78% 10%, ${accent}24 0, transparent 32%), radial-gradient(circle at 16% 100%, ${accent}16 0, transparent 34%), #171717`,
      }}
    >
      <div className="relative z-10">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#858585]">{eyebrow}</p>
        <h3 className="mt-4 font-syne text-3xl font-bold leading-tight text-white md:text-4xl">
          {title}
        </h3>
        <p className="mt-3 text-base font-semibold leading-relaxed text-[#9a9a9a] md:text-lg">
          {body}
        </p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  )
}

function ArtistStoryCard({
  artist,
  title,
  body,
  accent,
  footer,
  className = '',
}: {
  artist?: Artist
  title: string
  body: string
  accent: string
  footer?: ReactNode
  className?: string
}) {
  return (
    <section
      className={`overflow-hidden rounded-[26px] bg-[#1f1f1f] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.34)] ${className}`}
      style={{
        boxShadow: `0 24px 90px rgba(0,0,0,0.34), 0 0 80px ${accent}14`,
      }}
    >
      <Artwork
        src={artist?.artist_image_url}
        alt={artist?.artist_name ?? 'Top artist'}
        className="mx-auto h-56 w-56 md:h-64 md:w-64"
      />
      <h3 className="mt-6 font-syne text-3xl font-bold leading-tight text-white md:text-4xl">
        {title}
      </h3>
      <p className="mt-3 text-base font-semibold leading-relaxed text-[#9a9a9a] md:text-lg">
        {body}
      </p>
      {footer && <div className="mt-6">{footer}</div>}
    </section>
  )
}

function ArtistPortraitStrip({ artists }: { artists: Artist[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {artists.slice(0, 7).map((artist, index) => (
        <div key={artist.id} className="group relative">
          <Artwork
            src={artist.artist_image_url}
            alt={artist.artist_name}
            className="h-16 w-16 border border-white/[0.10]"
          />
          <span className="absolute -left-1 -top-1 rounded-full bg-black/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
            {index + 1}
          </span>
        </div>
      ))}
    </div>
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

function rgbaFromHex(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const value = Number.parseInt(clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function ArtistSegmentedTimeline({
  data,
  artists,
  rangeLabel,
  className = '',
}: {
  data?: ArtistTimelineBucket[]
  artists: Artist[]
  rangeLabel: string
  className?: string
}) {
  const activeBucketEntries = Array.from(
    new Map(
      (data ?? [])
        .filter((row) => row.total_ms > 0 || row.plays > 0)
        .map((row) => [row.bucket_index, row.bucket_label]),
    ).entries(),
  )
    .sort((a, b) => a[0] - b[0])
  const bucketIndexes = activeBucketEntries.map((entry) => entry[0])
  const bucketLabels = activeBucketEntries.map((entry) => entry[1])

  if (!bucketLabels.length) {
    return (
      <section className={`rounded-[28px] border border-white/[0.08] bg-[#101010] p-6 ${className}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-syne text-2xl font-bold text-white">Top artists over time</h2>
            <p className="mt-1 text-sm font-semibold text-[#8a8a8a]">
              How your top artists were distributed across this selected period.
            </p>
          </div>
          <span className="rounded-full border border-white/[0.08] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#777]">
            {rangeLabel}
          </span>
        </div>
        <p className="mt-8 text-sm font-semibold leading-relaxed text-[#777]">
          Import listening history to see range-specific artist movement here.
        </p>
      </section>
    )
  }

  const visibleArtists = artists.slice(0, 6)
  const byArtistBucket = new Map<string, ArtistTimelineBucket>()
  ;(data ?? []).forEach((row) => {
    byArtistBucket.set(`${row.artist_name.toLowerCase()}-${row.bucket_index}`, row)
  })
  const maxMs = Math.max(...(data ?? []).map((row) => row.total_ms), 1)
  const hasListening = (data ?? []).some((row) => row.total_ms > 0 || row.plays > 0)
  const artistRows = visibleArtists.map((artist, artistIndex) => {
    const buckets = bucketIndexes.map((bucketIndex, index) => (
      byArtistBucket.get(`${artist.artist_name.toLowerCase()}-${bucketIndex}`) ?? {
        artist_name: artist.artist_name,
        bucket_index: bucketIndex,
        bucket_label: bucketLabels[index],
        plays: 0,
        total_ms: 0,
      }
    ))
    const totalMs = buckets.reduce((sum, bucket) => sum + bucket.total_ms, 0)
    const totalPlays = buckets.reduce((sum, bucket) => sum + bucket.plays, 0)

    return {
      artist,
      artistIndex,
      buckets,
      color: ARTIST_COLORS[artistIndex % ARTIST_COLORS.length],
      totalMs,
      totalPlays,
    }
  })
  const maxArtistMs = Math.max(...artistRows.map((row) => row.totalMs), 1)

  return (
    <section className={`overflow-visible rounded-[28px] border border-white/[0.08] bg-[#101010] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.25)] md:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-syne text-2xl font-bold text-white">Top artists over time</h2>
          <p className="mt-1 text-sm font-semibold text-[#8a8a8a]">
            How your top artists were distributed across this selected period.
          </p>
        </div>
        <span className="rounded-full border border-white/[0.08] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#777]">
          {rangeLabel}
        </span>
      </div>

      {!hasListening && (
        <p className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-sm font-semibold text-[#777]">
          No imported listening history matched these artists for this selected range yet.
        </p>
      )}

      <div className="mt-8 overflow-visible pb-2">
        <div className="overflow-visible">
          <div className="grid grid-cols-[120px_minmax(0,1fr)_78px] gap-4 md:grid-cols-[150px_minmax(0,1fr)_96px] md:gap-6">
            <div />
            <div className="flex flex-wrap items-center gap-2 pb-4">
              {bucketLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#777]"
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="pb-4 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-[#666]">total</div>
          </div>

          <div className="space-y-6">
            {artistRows.map((row) => {
              const barWidth = row.totalMs > 0 ? Math.max(22, (row.totalMs / maxArtistMs) * 100) : 100
              const activeBuckets = row.buckets.filter((bucket) => bucket.total_ms > 0 || bucket.plays > 0)
              return (
                <div key={row.artist.id} className="grid grid-cols-[120px_minmax(0,1fr)_78px] items-center gap-4 md:grid-cols-[150px_minmax(0,1fr)_96px] md:gap-6">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white md:text-base">{row.artist.artist_name}</p>
                    <p className="mt-1 font-mono text-xs text-[#777]">#{row.artistIndex + 1}</p>
                  </div>

                  <div className="relative h-12 rounded-xl bg-white/[0.045]">
                    <div
                      className="flex h-full rounded-xl"
                      style={{ width: `${barWidth}%` }}
                    >
                      {activeBuckets.length ? activeBuckets.map((bucket, bucketIndex) => {
                        const intensity = maxMs > 0 ? bucket.total_ms / maxMs : 0
                        const alpha = 0.42 + Math.min(intensity, 1) * 0.48
                        const isFirst = bucketIndex === 0
                        const isLast = bucketIndex === activeBuckets.length - 1
                        const segmentWeight = bucket.total_ms > 0 ? bucket.total_ms : 1
                        const showTooltipBelow = row.artistIndex === 0
                        const alignTooltipRight = bucketIndex >= activeBuckets.length - 2

                        return (
                          <div
                            key={`${row.artist.artist_name}-${bucket.bucket_label}`}
                            className={`group relative h-full min-w-[10px] border-r border-[#101010] ${isFirst ? 'rounded-l-xl' : ''} ${isLast ? 'rounded-r-xl border-r-0' : ''}`}
                            style={{
                              flex: `${segmentWeight} 1 0`,
                              background: rgbaFromHex(row.color, alpha),
                              boxShadow: bucket.total_ms > 0 ? `0 0 28px ${rgbaFromHex(row.color, intensity * 0.18)}` : undefined,
                            }}
                          >
                            <div
                              className={`pointer-events-none absolute z-50 hidden w-[230px] rounded-2xl border border-white/[0.10] bg-[#121212]/95 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur group-hover:block ${
                                showTooltipBelow ? 'top-full mt-3' : 'top-0 -translate-y-[calc(100%+12px)]'
                              } ${alignTooltipRight ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate font-syne text-base font-bold" style={{ color: row.color }}>
                                  {row.artist.artist_name}
                                </p>
                                <span className="rounded-full bg-white/[0.08] px-2 py-1 text-xs font-bold text-white">
                                  {bucket.bucket_label}
                                </span>
                              </div>
                              <div className="mt-3 space-y-2 text-sm font-semibold text-[#b8b8b8]">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-2">
                                    <Clock3 className="h-4 w-4 text-[#777]" />
                                    Listening time
                                  </span>
                                  <span className="text-white">{formatMinutes(bucket.total_ms / 60000)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-2">
                                    <Play className="h-4 w-4 text-[#777]" />
                                    Play count
                                  </span>
                                  <span className="text-white">{formatNumber(bucket.plays)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      }) : (
                        <div className="h-full w-full rounded-xl bg-white/[0.035]" />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-white">{formatMinutes(row.totalMs / 60000)}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#666]">
                      {formatNumber(row.totalPlays)} plays
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export function ArtistInsightsDashboard({ artists, range, rangeLabel }: ArtistInsightsDashboardProps) {
  const mode = getWeightMode(artists)
  const timelineNames = useMemo(() => artists.slice(0, 8).map((artist) => artist.artist_name), [artists])
  const { data: allTimeArtists } = useHistoryTopArtists(undefined, 50)
  const { data: artistTimeline } = useHistoryArtistTimeline(timelineNames, range, 8)

  if (!artists.length) return null

  const currentWeights = buildCurrentWeights(artists, mode)
  const genreLanes = buildGenreLanes(artists, mode)
  const allTimeOverlap = buildAllTimeOverlap(artists, allTimeArtists)
  const totalWeight = currentWeights.reduce((sum, item) => sum + item.value, 0)
  const topArtist = currentWeights[0]
  const topArtistRecord = topArtist
    ? artists.find((artist) => artist.artist_name.toLowerCase() === topArtist.label.toLowerCase())
    : artists[0]
  const topArtistShare = topArtist && totalWeight > 0 ? (topArtist.value / totalWeight) * 100 : 0
  const topLane = genreLanes[0]
  const genreTotal = genreLanes.reduce((sum, item) => sum + item.value, 0)
  const topLaneShare = topLane && genreTotal > 0 ? (topLane.value / genreTotal) * 100 : 0
  const accent = topLane?.color ?? '#1DB954'
  const allTimeRanks = new Map((allTimeArtists ?? []).map((artist, index) => [artist.artist_name.toLowerCase(), index + 1]))
  const currentInAllTimeTop50 = artists.filter((artist) => allTimeRanks.has(artist.artist_name.toLowerCase())).length
  const memoryNames = new Set(allTimeOverlap.slice(0, 7).map((artist) => artist.label.toLowerCase()))
  const memoryArtists = artists.filter((artist) => memoryNames.has(artist.artist_name.toLowerCase()))
  const totalListeningLabel = mode === 'minutes'
    ? formatMinutes(totalWeight)
    : mode === 'plays'
      ? `${formatNumber(totalWeight)} plays`
      : `${artists.length} artists`
  const leaderBody = topArtist
    ? `${topArtist.label} is carrying ${formatPercent(topArtistShare)} of this artist row for ${rangeLabel}.`
    : `These artists are shaping your ${rangeLabel} listening.`

  return (
    <div className="mt-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-syne text-2xl font-bold text-white">Artist listening stats</h2>
          <p className="mt-1 text-sm font-semibold text-[#8a8a8a]">
            Your top artists from {rangeLabel}, turned into a few actual listening moments.
          </p>
        </div>
        <Share2 className="hidden h-5 w-5 text-[#8a8a8a] sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-6 xl:grid-cols-12">
        <StatFeatureCard
          eyebrow="Top artist"
          title={topArtist?.label ?? topArtistRecord?.artist_name ?? 'Unknown artist'}
          imageSrc={topArtistRecord?.artist_image_url}
          imageAlt={topArtistRecord?.artist_name ?? topArtist?.label ?? 'Top artist'}
          badge={topArtistShare > 0 ? formatPercent(topArtistShare) : undefined}
          className="md:col-span-3 xl:col-span-3"
        />

        <TextStoryCard
          eyebrow="Main lane"
          title={topLane?.label ?? 'Genres syncing'}
          body={
            topLane
              ? `${topLane.label} is the strongest shared sound in this artist set, holding ${formatPercent(topLaneShare)} of the tagged lane mix.`
              : 'Once artist tags are attached, this becomes the clearest read on the sound carrying the page.'
          }
          accent={accent}
          className="md:col-span-3 xl:col-span-3"
        >
          {genreLanes.length ? <BarList items={genreLanes} mode={mode} maxItems={4} /> : null}
        </TextStoryCard>

        <TextStoryCard
          eyebrow="Total pull"
          title={totalListeningLabel}
          body={
            mode === 'minutes'
              ? `That is the listening time matched across this top-artist row for ${rangeLabel}.`
              : mode === 'plays'
                ? `That is how many matched plays these artists collected in ${rangeLabel}.`
                : `These are the artists shaping this view for ${rangeLabel}.`
          }
          accent="#1DB954"
          className="md:col-span-6 xl:col-span-6"
        >
          <BarList items={currentWeights} mode={mode} maxItems={4} />
        </TextStoryCard>

        <ArtistStoryCard
          artist={topArtistRecord}
          title={topArtist ? `${topArtist.label} carried the range` : 'Your top artist sets the tone'}
          body={leaderBody}
          accent={accent}
          className="md:col-span-6 xl:col-span-7"
          footer={topArtistRecord && (
            <div className="flex items-center gap-4">
              <Artwork
                src={topArtistRecord.artist_image_url}
                alt={topArtistRecord.artist_name}
                className="h-14 w-14 shrink-0 border border-white/[0.10]"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-white">{topArtistRecord.artist_name}</p>
                <p className="truncate text-base font-semibold text-[#8a8a8a]">
                  {topArtistRecord.genres?.slice(0, 3).join(', ') || formatWeight(topArtist?.value ?? 0, mode)}
                </p>
              </div>
            </div>
          )}
        />

        <TextStoryCard
          eyebrow="Artist constellation"
          title={`${artists.length} artists in orbit`}
          body="The row reads like a cast list for this period, with the strongest names sitting closest to the front."
          accent="#60a5fa"
          className="md:col-span-6 xl:col-span-5"
        >
          <ArtistPortraitStrip artists={artists} />
        </TextStoryCard>

        <ArtistSegmentedTimeline
          data={artistTimeline}
          artists={artists}
          rangeLabel={rangeLabel}
          className="md:col-span-6 xl:col-span-12"
        />

        <TextStoryCard
          eyebrow="Genre lanes"
          title={topLane ? `${formatPercent(topLaneShare)} ${topLane.label}` : 'No dominant lane yet'}
          body={
            topLane
              ? `Your artist row leans hardest into ${topLane.label}, with adjacent genres showing how wide the taste pocket is.`
              : 'Genre tags will turn this into a visual read on the sounds binding your top artists.'
          }
          accent={accent}
          className="md:col-span-3 xl:col-span-6"
        >
          {genreLanes.length ? (
            <BarList items={genreLanes} mode={mode} maxItems={7} />
          ) : (
            <p className="text-sm font-semibold text-[#777]">No genre tags are attached to these artists yet.</p>
          )}
        </TextStoryCard>

        <TextStoryCard
          eyebrow="All-time memory"
          title={`${currentInAllTimeTop50}/${artists.length} still in rotation`}
          body="This shows how much of the current row overlaps with your imported all-time artist memory."
          accent="#818cf8"
          className="md:col-span-3 xl:col-span-6"
        >
          <ArtistPortraitStrip artists={memoryArtists.length ? memoryArtists : artists.slice(0, 5)} />
          {allTimeOverlap.length ? (
            <div className="mt-5">
              <BarList items={allTimeOverlap} mode="minutes" maxItems={5} />
            </div>
          ) : (
            <p className="mt-5 text-sm font-semibold leading-relaxed text-[#777]">
              Import history to compare today&apos;s top artists against your all-time leaders.
            </p>
          )}
        </TextStoryCard>
      </div>
    </div>
  )
}
