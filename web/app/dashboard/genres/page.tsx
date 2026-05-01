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

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-syne font-bold text-2xl text-primary">Genre Distribution</h1>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
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
