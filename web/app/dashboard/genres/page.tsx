'use client'

import { useSearchParams } from 'next/navigation'
import { useGenres } from '@/hooks/useGenres'
import { GenreChart } from '@/components/genres/GenreChart'
import { TrendList } from '@/components/genres/TrendList'
import { Skeleton } from '@/components/ui/Skeleton'
import type { TimeRange } from '@/lib/types'

export default function GenresPage() {
  const searchParams = useSearchParams()
  const range = (searchParams.get('range') ?? 'short_term') as TimeRange
  const { genres, isLoading } = useGenres(range)
  const { genres: allTimeGenres } = useGenres('long_term')
  const rangeLabel = range === 'short_term' ? 'past 4 weeks' : range === 'medium_term' ? 'past 6 months' : 'all time'

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-syne text-3xl font-bold text-primary">Top genres</h1>
        <p className="mt-1 text-base font-semibold text-[#8a8a8a]">
          Your top genres from {rangeLabel}
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-white/[0.06] bg-[#121212] p-2.5">
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {genres && genres.length === 0 && (
        <p className="text-muted text-sm py-20 text-center">
          Sync your tracks first to see genre data.
        </p>
      )}

      {genres && genres.length > 0 && (
        <div className="space-y-10">
          <GenreChart data={genres} />
          {range !== 'long_term' && allTimeGenres && allTimeGenres.length > 0 && (
            <div>
              <h2 className="font-syne font-semibold text-sm text-muted uppercase tracking-widest mb-4">
                vs. All Time
              </h2>
              <TrendList current={genres} allTime={allTimeGenres} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
