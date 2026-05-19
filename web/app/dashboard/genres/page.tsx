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
        <h1 className="font-syne text-4xl font-bold text-white">Genres</h1>
        <p className="mt-1 text-base font-semibold text-[#8a8a8a]">
          Your genre mix from {rangeLabel}, organized into taste lanes.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-6 xl:grid-cols-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-5 rounded-[24px] border border-white/[0.06] bg-[#121212] p-5 md:col-span-3 xl:col-span-4">
              <Skeleton className="h-4 w-1/3 rounded-full" />
              <Skeleton className="h-10 w-3/4 rounded-full" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ))}
          <div className="space-y-5 rounded-[28px] border border-white/[0.06] bg-[#121212] p-6 md:col-span-6 xl:col-span-12">
            <Skeleton className="h-6 w-56 rounded-full" />
            <Skeleton className="h-[360px] w-full rounded-[24px]" />
          </div>
        </div>
      )}

      {genres && genres.length === 0 && (
        <p className="text-muted text-sm py-20 text-center">
          Sync your tracks first to see genre data.
        </p>
      )}

      {genres && genres.length > 0 && (
        <div className="space-y-10">
          <GenreChart data={genres} rangeLabel={rangeLabel} />
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
