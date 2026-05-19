'use client'

import Image from 'next/image'
import { ChevronRight, Share2 } from 'lucide-react'
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

interface WeightedTrack extends WeightedItem {
  track: Track
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

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value)}%`
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

function Artwork({
  src,
  alt,
  shape = 'square',
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
          ♫
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
  imageShape = 'square',
  badge,
  className = '',
}: {
  eyebrow: string
  title: string
  imageSrc?: string | null
  imageAlt: string
  imageShape?: 'square' | 'circle'
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
          shape={imageShape}
          className={imageShape === 'circle' ? 'h-32 w-32' : 'h-32 w-32'}
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

function StoryCard({
  title,
  body,
  imageSrc,
  imageAlt,
  accent = '#1DB954',
  footer,
  className = '',
}: {
  title: string
  body: string
  imageSrc?: string | null
  imageAlt: string
  accent?: string
  footer?: React.ReactNode
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
        src={imageSrc}
        alt={imageAlt}
        className="aspect-[16/10] w-full"
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
  children?: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#171717] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.26)] ${className}`}
      style={{
        background: `radial-gradient(circle at 78% 10%, ${accent}33 0, transparent 32%), radial-gradient(circle at 16% 100%, ${accent}22 0, transparent 34%), #171717`,
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

export function TrackInsightsDashboard({ tracks, genres, rangeLabel }: TrackInsightsDashboardProps) {
  if (!tracks.length) return null

  const mode = getWeightMode(tracks)
  const totalWeight = tracks.reduce((sum, track) => sum + getTrackWeight(track, mode, tracks.length), 0)
  const exactMinutes = tracks.reduce((sum, track) => sum + (track.minutes_played ?? 0), 0)
  const totalPlays = tracks.reduce((sum, track) => sum + (track.play_count ?? 0), 0)
  const weightedTracks: WeightedTrack[] = [...tracks]
    .map((track) => ({
      label: track.track_name,
      sublabel: track.artist_name,
      value: getTrackWeight(track, mode, tracks.length),
      valueLabel: formatWeight(getTrackWeight(track, mode, tracks.length), mode),
      track,
    }))
    .sort((a, b) => b.value - a.value)
  const topTrack = weightedTracks[0]
  const repeatTrack = [...weightedTracks].sort((a, b) => {
    const bPlays = b.track.play_count ?? 0
    const aPlays = a.track.play_count ?? 0
    if (bPlays !== aPlays) return bPlays - aPlays
    return b.value - a.value
  })[0] ?? topTrack
  const genreMix = buildGenreMix(tracks, genres, mode)
  const topGenre = genreMix[0]
  const artistShare = buildArtistShare(tracks, mode)
  const topArtist = artistShare[0]
  const topArtistTrack = topArtist
    ? weightedTracks.find((item) => item.track.artist_name === topArtist.label)?.track
    : topTrack?.track
  const topArtistShare = topArtist && totalWeight > 0 ? (topArtist.value / totalWeight) * 100 : 0
  const topGenreShare = topGenre
    ? genres?.length
      ? topGenre.value
      : totalWeight > 0
        ? (topGenre.value / totalWeight) * 100
        : 0
    : 0
  const accent = topGenre?.color ?? '#1DB954'
  const repeatPlays = repeatTrack?.track.play_count ?? 0
  const repeatMinutes = repeatTrack?.track.minutes_played ?? 0
  const repeatTitle = repeatPlays > 0
    ? `You hit ${formatNumber(repeatPlays)} plays`
    : repeatMinutes > 0
      ? `You spent ${formatMinutes(repeatMinutes)} here`
      : `${repeatTrack?.track.track_name ?? topTrack?.label} led the row`
  const repeatBody = repeatTrack
    ? `${repeatTrack.track.track_name} by ${repeatTrack.track.artist_name} was the track you returned to most in ${rangeLabel}.`
    : 'Your top track set the tone for this listening period.'
  const totalListeningLabel = exactMinutes > 0
    ? formatMinutes(exactMinutes)
    : totalPlays > 0
      ? `${formatNumber(totalPlays)} plays`
      : `${tracks.length} tracks`

  return (
    <div className="mt-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-syne text-2xl font-bold text-white">Listening stats</h2>
          <p className="mt-1 text-sm font-semibold text-[#8a8a8a]">
            Your top tracks from {rangeLabel}, turned into a few actual listening moments.
          </p>
        </div>
        <Share2 className="hidden h-5 w-5 text-[#8a8a8a] sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-6 xl:grid-cols-12">
        <StatFeatureCard
          eyebrow="Top artist"
          title={topArtist?.label ?? topTrack?.track.artist_name ?? 'Unknown artist'}
          imageSrc={topArtistTrack?.album_art_url}
          imageAlt={topArtistTrack?.album_name ?? topArtist?.label ?? 'Top artist'}
          imageShape="circle"
          badge={topArtistShare > 0 ? formatPercent(topArtistShare) : undefined}
          className="md:col-span-3 xl:col-span-3"
        />

        <StatFeatureCard
          eyebrow="Top song"
          title={topTrack?.track.track_name ?? 'Unknown song'}
          imageSrc={topTrack?.track.album_art_url}
          imageAlt={topTrack?.track.album_name ?? topTrack?.track.track_name ?? 'Top song'}
          badge={topTrack ? formatWeight(topTrack.value, mode) : undefined}
          className="md:col-span-3 xl:col-span-3"
        />

        <TextStoryCard
          eyebrow="Total pull"
          title={totalListeningLabel}
          body={
            exactMinutes > 0
              ? `That is the listening time matched across this top-track row for ${rangeLabel}.`
              : totalPlays > 0
                ? `That is how many matched plays these top tracks collected in ${rangeLabel}.`
                : `These are the tracks shaping this view for ${rangeLabel}.`
          }
          accent="#1DB954"
          className="md:col-span-6 xl:col-span-6"
        >
          <BarList items={weightedTracks} mode={mode} maxItems={4} />
        </TextStoryCard>

        <StoryCard
          title={repeatTitle}
          body={repeatBody}
          imageSrc={repeatTrack?.track.album_art_url}
          imageAlt={repeatTrack?.track.album_name ?? repeatTrack?.track.track_name ?? 'Repeat track'}
          accent={accent}
          className="md:col-span-6 xl:col-span-7"
          footer={repeatTrack && (
            <div className="flex items-center gap-4">
              <Artwork
                src={repeatTrack.track.album_art_url}
                alt={repeatTrack.track.album_name ?? repeatTrack.track.track_name}
                className="h-14 w-14 shrink-0 rounded-xl"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-white">{repeatTrack.track.track_name}</p>
                <p className="truncate text-base font-semibold text-[#8a8a8a]">{repeatTrack.track.artist_name}</p>
              </div>
            </div>
          )}
        />

        <TextStoryCard
          eyebrow="Main lane"
          title={topGenre ? `${formatPercent(topGenreShare)} of your music listening` : 'Genres are still syncing'}
          body={
            topGenre
              ? `${topGenre.label} is the strongest sound in this track set, with the rest of the row orbiting around it.`
              : 'Once genre tags land, this card becomes the clearest read on what sound is driving the row.'
          }
          accent={accent}
          className="md:col-span-6 xl:col-span-5"
        >
          {genreMix.length ? (
            <BarList items={genreMix} mode={genres?.length ? 'rank' : mode} maxItems={5} />
          ) : null}
        </TextStoryCard>

        <InsightCard title="Artist pull" label={mode} className="md:col-span-6 xl:col-span-5">
          <BarList items={artistShare} mode={mode} maxItems={6} />
        </InsightCard>

        <InsightCard title="Track weight" label={mode} className="md:col-span-6 xl:col-span-7">
          <BarList items={weightedTracks} mode={mode} maxItems={8} />
        </InsightCard>
      </div>
    </div>
  )
}
