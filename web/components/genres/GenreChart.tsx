'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronRight, Share2 } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import type { Genre, GenreTag } from '@/lib/types'

interface GenreChartProps {
  data: Genre[]
  rangeLabel?: string
}

interface GenreItem {
  genre: string
  percentage: number
  color: string
  subgenres?: GenreTag[]
}

const MAX_CONSTELLATION_NODES = 12

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

function rgbaFromHex(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const value = Number.parseInt(clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  return `${value.toFixed(1)}%`
}

function normalizeGenreTag(tag: string | GenreTag): GenreTag {
  return typeof tag === 'string' ? { genre: tag } : tag
}

function getOrbitPoint(index: number, total: number, expanded: boolean) {
  const count = Math.max(total, 1)
  const angle = -Math.PI / 2 + (index / count) * Math.PI * 2
  const wobble = Math.sin(index * 1.7 + count * 0.37) * 3.8 + Math.sin(index * 3.1) * 2.1
  const radiusX = (expanded ? 34 : 38) + wobble
  const radiusY = (expanded ? 32 : 35) + Math.sin(index * 2.3) * 3.2

  return {
    x: 50 + Math.cos(angle) * radiusX,
    y: 52 + Math.sin(angle) * radiusY,
  }
}

function buildSubgenreBreakdown(item: GenreItem): GenreItem[] {
  const rawTags = Array.from(
    new Map(
      (item.subgenres ?? [])
        .filter((tag) => tag.genre && tag.genre !== item.genre && (tag.percentage ?? 0) > 0)
        .map((tag) => [tag.genre, tag]),
    ).values(),
  ).sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))

  const rawTotal = rawTags.reduce((sum, tag) => sum + (tag.percentage ?? 0), 0)
  if (rawTotal <= 0) return []

  const visible = rawTags.slice(0, MAX_CONSTELLATION_NODES)
  const scaled = visible.map((tag) => ({
    genre: tag.genre,
    percentage: item.percentage * ((tag.percentage ?? 0) / rawTotal),
    color: getGenreColor(tag.genre),
  }))
  const visibleTotal = scaled.reduce((sum, tag) => sum + tag.percentage, 0)
  const remainder = item.percentage - visibleTotal

  if (remainder >= 0.1 && rawTags.length > visible.length) {
    scaled.push({
      genre: `${rawTags.length - visible.length} more tags`,
      percentage: remainder,
      color: item.color,
    })
  }

  return scaled
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
        background: `radial-gradient(circle at 78% 10%, ${rgbaFromHex(accent, 0.14)} 0, transparent 32%), radial-gradient(circle at 16% 100%, ${rgbaFromHex(accent, 0.10)} 0, transparent 34%), #171717`,
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

function StatFeatureCard({
  eyebrow,
  title,
  body,
  accent,
  badge,
  children,
  className = '',
}: {
  eyebrow: string
  title: string
  body: string
  accent: string
  badge?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={`relative flex min-h-[260px] flex-col overflow-hidden rounded-[24px] bg-[#1f1f1f] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.28)] ${className}`}>
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-2xl"
        style={{ background: rgbaFromHex(accent, 0.24) }}
      />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <p className="text-sm font-bold text-[#969696]">{eyebrow}</p>
        <ChevronRight className="h-5 w-5 shrink-0 text-[#a4a4a4]" />
      </div>

      <h3 className="relative z-10 mt-2 line-clamp-2 font-syne text-3xl font-bold leading-[0.95] text-white">
        {title}
      </h3>
      <p className="relative z-10 mt-3 text-sm font-semibold leading-relaxed text-[#8f8f8f]">
        {body}
      </p>

      <div className="relative z-10 mt-auto pt-7">
        {children}
        {badge && (
          <span
            className="inline-flex rounded-full px-3 py-1.5 text-sm font-bold text-white"
            style={{ background: rgbaFromHex(accent, 0.28) }}
          >
            {badge}
          </span>
        )}
      </div>
    </section>
  )
}

function GenreBubble({ item, size, rank }: { item: GenreItem; size: number; rank?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex shrink-0 items-center justify-center rounded-full border border-white/[0.14]"
        style={{
          width: size,
          height: size,
          background: item.color,
          boxShadow: `0 0 ${size * 0.7}px ${rgbaFromHex(item.color, 0.18)}`,
        }}
      >
        {rank && (
          <span className="rounded-full bg-black/60 px-2 py-0.5 font-mono text-xs font-bold text-white">
            {rank}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-white">{item.genre}</p>
        <p className="font-mono text-xs text-[#777]">{formatPercent(item.percentage)}</p>
      </div>
    </div>
  )
}

function BarList({ items, maxItems = 6 }: { items: GenreItem[]; maxItems?: number }) {
  const visible = items.slice(0, maxItems)
  const max = Math.max(...visible.map((item) => item.percentage), 1)

  return (
    <div className="space-y-3">
      {visible.map((item, index) => {
        const width = Math.max(4, (item.percentage / max) * 100)
        return (
          <div key={`${item.genre}-${index}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-bold text-white">{item.genre}</span>
              <span className="shrink-0 font-mono text-[#777]">{formatPercent(item.percentage)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${width}%`,
                  background: item.color,
                  boxShadow: `0 0 24px ${rgbaFromHex(item.color, 0.16)}`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GenreConstellationCard({
  items,
  profileImageUrl,
  profileName,
  className = '',
}: {
  items: GenreItem[]
  profileImageUrl?: string | null
  profileName?: string | null
  className?: string
}) {
  const [selectedGenre, setSelectedGenre] = useState<GenreItem | null>(null)
  const visible = items.slice(0, 10)
  const subgenreItems = selectedGenre ? buildSubgenreBreakdown(selectedGenre) : []
  const displayItems = selectedGenre ? subgenreItems : visible
  const top = selectedGenre ?? visible[0]
  const max = Math.max(...displayItems.map((item) => item.percentage), 1)
  const isExpanded = Boolean(selectedGenre)
  const centerColor = selectedGenre?.color ?? '#54d8b2'
  const centerLabel = profileName?.slice(0, 1).toUpperCase() ?? 'S'

  return (
    <section className={`relative min-h-[520px] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#101010] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.32)] ${className}`}>
      <div className="relative z-20 flex items-start justify-between gap-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#858585]">
            {isExpanded ? 'Subgenre map' : 'Taste map'}
          </p>
          <h2 className="mt-3 font-syne text-3xl font-bold leading-tight text-white">
            {selectedGenre ? `${selectedGenre.genre} constellation` : 'Genre constellation'}
          </h2>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-[#8a8a8a]">
            {selectedGenre
              ? `The smaller tags that build ${formatPercent(selectedGenre.percentage)} of your listening.`
              : 'Click a genre node to expand the smaller tags that build that lane.'}
          </p>
        </div>
        {selectedGenre ? (
          <button
            type="button"
            onClick={() => setSelectedGenre(null)}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#aaa] transition hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            genres
          </button>
        ) : (
          <span className="rounded-full border border-white/[0.08] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#777]">
            click nodes
          </span>
        )}
      </div>

      <div
        className="absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(circle at 50% 52%, ${top ? rgbaFromHex(top.color, 0.18) : 'rgba(29,185,84,0.12)'} 0, transparent 38%), radial-gradient(circle at 78% 72%, rgba(29,185,84,0.10) 0, transparent 32%), #101010`,
        }}
      />

      <div className="absolute inset-x-5 bottom-5 top-28">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {displayItems.map((item, index) => {
            const point = getOrbitPoint(index, displayItems.length, isExpanded)
            return (
              <line
                key={`${item.genre}-line`}
                x1="50"
                y1="52"
                x2={point.x}
                y2={point.y}
                stroke={rgbaFromHex(isExpanded ? selectedGenre?.color ?? item.color : item.color, isExpanded ? 0.34 : 0.22)}
                strokeWidth={isExpanded ? '0.5' : '0.35'}
              />
            )
          })}
        </svg>

        <button
          type="button"
          onClick={() => selectedGenre && setSelectedGenre(null)}
          className="group absolute left-1/2 top-[52%] z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.16] bg-[#111] p-1 shadow-[0_26px_90px_rgba(0,0,0,0.36)] transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/25"
          style={{
            width: 116,
            height: 116,
            boxShadow: `0 0 88px ${rgbaFromHex(centerColor, 0.18)}, inset 0 0 0 2px ${rgbaFromHex(centerColor, 0.35)}`,
          }}
          aria-label={selectedGenre ? 'Return to all genre nodes' : 'Your profile node'}
          title={selectedGenre ? 'Back to all genres' : profileName ?? 'Your profile'}
        >
          <span
            className="absolute inset-[-22px] rounded-full opacity-80 blur-xl"
            style={{ background: rgbaFromHex(centerColor, 0.16) }}
          />
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt={profileName ?? 'Profile'}
              className="relative z-10 h-full w-full rounded-full object-cover"
            />
          ) : (
            <span
              className="relative z-10 flex h-full w-full items-center justify-center rounded-full font-syne text-4xl font-bold text-[#072018]"
              style={{ background: 'linear-gradient(135deg, #88f8d5, #35c79c)' }}
            >
              {centerLabel}
            </span>
          )}
        </button>

        {displayItems.length === 0 && selectedGenre ? (
          <div className="absolute left-1/2 top-[52%] z-10 w-[min(360px,80%)] -translate-x-1/2 translate-y-20 rounded-2xl border border-white/[0.08] bg-black/45 px-5 py-4 text-center text-sm font-semibold text-[#9a9a9a]">
            No smaller tags are attached to this genre yet.
          </div>
        ) : null}

        {displayItems.map((item, index) => {
          const point = getOrbitPoint(index, displayItems.length, isExpanded)
          const size = Math.max(isExpanded ? 50 : 58, Math.min(isExpanded ? 104 : 122, 44 + (item.percentage / max) * (isExpanded ? 62 : 78)))
          const hasSubgenres = (item.subgenres?.length ?? 0) > 0
          return (
            <button
              type="button"
              key={item.genre}
              onClick={() => !isExpanded && hasSubgenres && setSelectedGenre(item)}
              disabled={isExpanded || !hasSubgenres}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full text-center transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-default disabled:hover:scale-100"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              title={
                isExpanded
                  ? `${item.genre}: ${formatPercent(item.percentage)} of listening within ${selectedGenre?.genre}`
                  : hasSubgenres
                    ? `Open ${item.genre} subgenres`
                    : `${item.genre}: ${formatPercent(item.percentage)}`
              }
            >
              <div
                className="flex items-center justify-center rounded-full border border-white/[0.16] text-center shadow-[0_22px_70px_rgba(0,0,0,0.34)]"
                style={{
                  width: size,
                  height: size,
                  background: item.color,
                  boxShadow: `0 0 ${size * 0.72}px ${rgbaFromHex(item.color, 0.18)}, inset 0 0 0 2px ${rgbaFromHex('#ffffff', 0.12)}`,
                }}
              >
                <div className="px-3">
                  <p className="line-clamp-2 font-syne text-sm font-bold leading-tight text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)] md:text-base">
                    {item.genre}
                  </p>
                  <p className="mt-1 font-mono text-[10px] font-bold text-white/80">{formatPercent(item.percentage)}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function RankedGenreStrip({ items, className = '' }: { items: GenreItem[]; className?: string }) {
  const max = Math.max(...items.map((item) => item.percentage), 1)

  return (
    <section className={`rounded-[26px] border border-white/[0.08] bg-[#101010] p-5 ${className}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-syne text-2xl font-bold text-white">Top genre lanes</h2>
          <p className="mt-1 text-sm font-semibold text-[#8a8a8a]">Ranked by share of listening in this view.</p>
        </div>
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#777]">1-{Math.min(items.length, 10)}</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-color:#333_transparent]">
        {items.slice(0, 10).map((item, index) => {
          const height = Math.max(42, Math.round((item.percentage / max) * 128))
          return (
            <article
              key={`${item.genre}-${index}`}
              className="flex min-w-[200px] flex-col rounded-[22px] border border-white/[0.08] bg-[#181818] p-4"
            >
              <div className="flex h-36 items-end rounded-2xl bg-white/[0.035] p-3">
                <div
                  className="w-full rounded-xl"
                  style={{
                    height,
                    background: `linear-gradient(180deg, ${rgbaFromHex(item.color, 0.96)}, ${rgbaFromHex(item.color, 0.42)})`,
                    boxShadow: `0 0 42px ${rgbaFromHex(item.color, 0.16)}`,
                  }}
                />
              </div>
              <p className="mt-4 text-lg font-bold leading-tight text-white">
                {index + 1}. {item.genre}
              </p>
              <p className="mt-1 font-mono text-sm text-[#888]">{formatPercent(item.percentage)} of listening</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export function GenreChart({ data, rangeLabel = 'this range' }: GenreChartProps) {
  const [showOtherGenres, setShowOtherGenres] = useState(false)
  const { user } = useUser()
  const { rankedGenres, otherBucket } = useMemo(() => {
    const named = data
      .filter((genre) => !genre.other_genres)
      .map((genre) => ({
        genre: genre.genre,
        percentage: genre.percentage,
        color: getGenreColor(genre.genre),
        subgenres: genre.subgenres,
      }))
      .sort((a, b) => b.percentage - a.percentage)
    const other = data.find((genre) => genre.other_genres?.length)

    return { rankedGenres: named, otherBucket: other }
  }, [data])

  if (!rankedGenres.length) return null

  const topGenre = rankedGenres[0]
  const secondGenre = rankedGenres[1]
  const activeLanes = rankedGenres.filter((genre) => genre.percentage >= 1).length
  const topThreeShare = rankedGenres.slice(0, 3).reduce((sum, genre) => sum + genre.percentage, 0)
  const accent = topGenre.color
  const smallerTags = rankedGenres
    .flatMap((genre) => (genre.subgenres ?? []).map((tag) => ({
      ...tag,
      parent: genre.genre,
      color: getGenreColor(tag.genre),
    })))
    .filter((tag) => tag.genre !== tag.parent)
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
  const otherTags = (otherBucket?.other_genres ?? [])
    .map(normalizeGenreTag)
    .map((tag) => ({
      ...tag,
      color: getGenreColor(tag.genre),
    }))
  const hiddenTags = Array.from(
    new Map([...smallerTags, ...otherTags].map((tag) => [tag.genre, tag])).values(),
  ).sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-syne text-2xl font-bold text-white">Genre listening stats</h2>
          <p className="mt-1 text-sm font-semibold text-[#8a8a8a]">
            Your sound lanes from {rangeLabel}, turned into a cleaner listening dashboard.
          </p>
        </div>
        <Share2 className="hidden h-5 w-5 text-[#8a8a8a] sm:block" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-6 xl:grid-cols-12">
        <StatFeatureCard
          eyebrow="Dominant lane"
          title={topGenre.genre}
          body={`${formatPercent(topGenre.percentage)} of your listening belongs to this lane.`}
          accent={topGenre.color}
          badge={formatPercent(topGenre.percentage)}
          className="md:col-span-3 xl:col-span-3"
        >
          <GenreBubble item={topGenre} size={104} rank={1} />
        </StatFeatureCard>

        <StatFeatureCard
          eyebrow="Next signal"
          title={secondGenre?.genre ?? 'Still syncing'}
          body={
            secondGenre
              ? `${formatPercent(secondGenre.percentage)} keeps the mix from becoming one-dimensional.`
              : 'More genre data will fill this slot after another sync.'
          }
          accent={secondGenre?.color ?? '#1DB954'}
          badge={secondGenre ? `#2` : undefined}
          className="md:col-span-3 xl:col-span-3"
        >
          {secondGenre ? <GenreBubble item={secondGenre} size={86} rank={2} /> : null}
        </StatFeatureCard>

        <TextStoryCard
          eyebrow="Total mix"
          title={`${formatPercent(topThreeShare)} in the top 3`}
          body="The strongest lanes explain most of the page, while the smaller ones show the edges of your taste."
          accent={accent}
          className="md:col-span-6 xl:col-span-6"
        >
          <BarList items={rankedGenres} maxItems={5} />
        </TextStoryCard>

        <GenreConstellationCard
          items={rankedGenres}
          profileImageUrl={user?.avatar_url}
          profileName={user?.display_name}
          className="md:col-span-6 xl:col-span-7"
        />

        <TextStoryCard
          eyebrow="Taste spread"
          title={`${activeLanes} active lanes`}
          body="This is the genre breadth that sits behind the ranked cards, with smaller lanes still kept visible."
          accent="#60a5fa"
          className="md:col-span-6 xl:col-span-5"
        >
          <div className="flex flex-wrap gap-2">
            {rankedGenres.slice(0, 14).map((genre) => (
              <span
                key={genre.genre}
                className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: rgbaFromHex(genre.color, 0.18) }}
              >
                {genre.genre}
              </span>
            ))}
          </div>
        </TextStoryCard>

        <RankedGenreStrip items={rankedGenres} className="md:col-span-6 xl:col-span-12" />

        {hiddenTags.length ? (
          <section className="rounded-[26px] border border-white/[0.08] bg-[#101010] p-5 md:col-span-6 xl:col-span-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-syne text-xl font-bold text-white">Smaller genre tags</h2>
                <p className="mt-1 text-sm font-semibold text-[#8a8a8a]">
                  Raw Spotify tags under the parent lanes. Hover or tap a tag to see its share.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOtherGenres((value) => !value)}
                className="rounded-full border border-white/[0.10] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.06]"
              >
                {showOtherGenres ? 'Hide tags' : `Show ${hiddenTags.length} tags`}
              </button>
            </div>

            {showOtherGenres && (
              <div className="mt-5 flex flex-wrap gap-2">
                {hiddenTags.map((tag) => (
                  <button
                    key={`${tag.genre}-${tag.percentage ?? 'unknown'}`}
                    type="button"
                    title={tag.percentage !== undefined ? `${tag.genre}: ${formatPercent(tag.percentage)} of listening` : tag.genre}
                    className="group rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-[#b5b5b5] transition hover:border-white/[0.18] hover:text-white focus:border-white/[0.18] focus:text-white focus:outline-none"
                  >
                    <span>{tag.genre}</span>
                    {tag.percentage !== undefined && (
                      <span
                        className="ml-2 inline-block max-w-0 overflow-hidden whitespace-nowrap align-bottom font-mono text-white/80 opacity-0 transition-all group-hover:max-w-16 group-hover:opacity-100 group-focus:max-w-16 group-focus:opacity-100"
                        style={{ color: tag.color }}
                      >
                        {formatPercent(tag.percentage)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  )
}
