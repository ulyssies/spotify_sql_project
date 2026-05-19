'use client'

import { useMemo } from 'react'
import { Compass, Music2, Radio, Sparkles } from 'lucide-react'
import { useRecommendations } from '@/hooks/useRecommendations'
import { RecommendationCard } from '@/components/recommendations/RecommendationCard'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Recommendation } from '@/lib/types'

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[1.6rem] border border-white/[0.08] bg-[#151515] p-4">
          <Skeleton className="aspect-[1.2] w-full rounded-2xl" />
          <Skeleton className="mt-5 h-4 w-44" />
          <Skeleton className="mt-4 h-7 w-56" />
          <Skeleton className="mt-3 h-4 w-36" />
        </div>
      ))}
    </div>
  )
}

function countTags(recommendations: Recommendation[]) {
  const counts = new Map<string, number>()
  recommendations.forEach((rec) => {
    ;[...(rec.matched_subgenres ?? []), ...(rec.matched_genres ?? [])].forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    })
  })
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
}

export default function RecommendationsPage() {
  const { recommendations = [], isLoading, error } = useRecommendations()

  const stats = useMemo(() => {
    const tagCounts = countTags(recommendations)
    const popular = recommendations.filter((rec) => (rec.popularity ?? 0) >= 70).length
    const averagePopularity = recommendations.length
      ? Math.round(recommendations.reduce((sum, rec) => sum + (rec.popularity ?? 0), 0) / recommendations.length)
      : 0
    const sources = new Set(recommendations.map((rec) => rec.source_artist).filter(Boolean))

    return {
      topTag: tagCounts[0]?.[0] ?? 'building',
      topTagCount: tagCounts[0]?.[1] ?? 0,
      popular,
      averagePopularity,
      sources: sources.size,
    }
  }, [recommendations])

  return (
    <div className="mx-auto flex w-full max-w-[118rem] flex-col gap-10 px-4 py-8 sm:px-8 lg:px-12">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#101010] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(29,185,84,0.18),transparent_34%),radial-gradient(circle_at_20%_75%,rgba(239,68,68,0.14),transparent_32%)]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.28em] text-accent">Recommendation engine</p>
            <h1 className="mt-3 font-syne text-5xl font-bold leading-none text-white sm:text-6xl">
              Fresh songs for your taste graph.
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed text-white/55">
              Popular tracks matched against your artists, genres, subgenres, and imported listening
              history, filtered to songs with under one hour of total listening time.
            </p>
          </div>
          <div className="rounded-full border border-white/[0.1] bg-black/35 px-5 py-3 font-mono text-sm uppercase tracking-[0.24em] text-white/55">
            under 1 hour overall
          </div>
        </div>
      </section>

      {!isLoading && !error && recommendations.length > 0 && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-[1.4rem] border border-white/[0.08] bg-[#121212] p-5">
            <Compass className="h-5 w-5 text-accent" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-white/35">Taste lane</p>
            <p className="mt-2 line-clamp-1 text-3xl font-bold text-white">{stats.topTag}</p>
            <p className="mt-2 text-sm font-semibold text-white/45">{stats.topTagCount} matched picks</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/[0.08] bg-[#121212] p-5">
            <Sparkles className="h-5 w-5 text-accent" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-white/35">Fresh pool</p>
            <p className="mt-2 text-3xl font-bold text-white">{recommendations.length}</p>
            <p className="mt-2 text-sm font-semibold text-white/45">under 1 hour total</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/[0.08] bg-[#121212] p-5">
            <Radio className="h-5 w-5 text-accent" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-white/35">Popular picks</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.popular}</p>
            <p className="mt-2 text-sm font-semibold text-white/45">70%+ Spotify popularity</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/[0.08] bg-[#121212] p-5">
            <Music2 className="h-5 w-5 text-accent" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-white/35">Seed artists</p>
            <p className="mt-2 text-3xl font-bold text-white">{stats.sources}</p>
            <p className="mt-2 text-sm font-semibold text-white/45">{stats.averagePopularity}% avg popularity</p>
          </div>
        </section>
      )}

      {isLoading && <SkeletonCards />}

      {error && (
        <div className="rounded-[1.6rem] border border-white/[0.08] bg-[#121212] px-6 py-16 text-center">
          <p className="text-lg font-semibold text-white">Recommendations could not load.</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
            {error.message}
          </p>
        </div>
      )}

      {!isLoading && !error && recommendations.length === 0 && (
        <div className="rounded-[1.6rem] border border-white/[0.08] bg-[#121212] px-6 py-16 text-center">
          <p className="text-lg font-semibold text-white">No unseen recommendations yet.</p>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Sync top tracks and artists, then import listening history so SpotYourVibe can find
            popular songs you have spent less than one hour with overall.
          </p>
        </div>
      )}

      {!isLoading && !error && recommendations.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-syne text-3xl font-bold text-white">Recommended songs</h2>
              <p className="mt-2 text-sm font-semibold text-white/45">
                Ranked by popularity, listening-graph match, and low total listening time.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((rec, i) => (
              <RecommendationCard key={`${rec.spotify_track_id ?? rec.track_name}-${i}`} rec={rec} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
