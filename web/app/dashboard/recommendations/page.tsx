'use client'

import { useRecommendations } from '@/hooks/useRecommendations'
import { RecommendationCard } from '@/components/recommendations/RecommendationCard'
import { Skeleton } from '@/components/ui/Skeleton'

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

export default function RecommendationsPage() {
  const { recommendations, isLoading, error } = useRecommendations()

  const noNewTracks =
    error?.message?.includes('no_new_tracks') ||
    error?.message?.includes('404')

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-2xl text-primary">For You</h1>
        <p className="text-muted text-sm mt-1">
          New tracks seeded from your listening history — nothing you&apos;ve heard before.
        </p>
      </div>

      {isLoading && <SkeletonCards />}

      {error && (
        <p className="text-muted text-sm py-20 text-center">
          {noNewTracks
            ? "We couldn't find tracks you haven't heard yet. Try syncing your data and checking back."
            : `Something went wrong: ${error.message}`}
        </p>
      )}

      {!isLoading && !error && recommendations?.length === 0 && (
        <p className="text-muted text-sm py-20 text-center">
          Sync your tracks first to get recommendations.
        </p>
      )}

      {recommendations && recommendations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recommendations.map((rec, i) => (
            <RecommendationCard key={i} rec={rec} />
          ))}
        </div>
      )}
    </div>
  )
}
