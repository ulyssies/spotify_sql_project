'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useArtists } from '@/hooks/useArtists'
import { useHistoryTopArtists } from '@/hooks/useHistoryData'
import { ArtistGrid } from '@/components/artists/ArtistGrid'
import { HistoryArtistCarousel } from '@/components/artists/HistoryArtistCarousel'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import type { TimeRange } from '@/lib/types'

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center space-y-2">
          <Skeleton className="aspect-square w-full max-w-[190px] rounded-full" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export default function ArtistsPage() {
  const searchParams = useSearchParams()
  const range = (searchParams.get('range') ?? 'short_term') as TimeRange
  const { artists, isLoading, error, mutate } = useArtists(range)
  const { artists: allTimeArtists } = useArtists('long_term')
  const { data: historyTopArtists } = useHistoryTopArtists(undefined, 25)
  const [isSyncing, setIsSyncing] = useState(false)

  async function handleSync() {
    setIsSyncing(true)
    try {
      await api.syncArtists(range)
      await mutate()
    } finally {
      setIsSyncing(false)
    }
  }

  const rangeLabel = range === 'short_term' ? 'past 4 weeks' : range === 'medium_term' ? 'past 6 months' : 'all time'
  const imageSources = [...(artists ?? []), ...(allTimeArtists ?? [])]

  return (
    <div>
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-syne text-3xl font-bold text-primary">Top artists</h1>
          <p className="mt-1 text-base font-semibold text-[#8a8a8a]">
            Your top artists from {rangeLabel}
          </p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing} variant="ghost" size="sm">
          {isSyncing ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border border-muted border-t-transparent rounded-full animate-spin" />
              Syncing
            </span>
          ) : (
            '↻ Sync'
          )}
        </Button>
      </div>

      {error && !artists && (
        <div className="text-center py-20">
          <p className="text-muted text-sm mb-4">No data yet.</p>
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? 'Syncing...' : 'Sync your Spotify data'}
          </Button>
        </div>
      )}

      {isLoading && !artists && <GridSkeleton />}

      <div className="space-y-12">
        {artists && <ArtistGrid artists={artists} />}
        {historyTopArtists && historyTopArtists.length > 0 && (
          <HistoryArtistCarousel artists={historyTopArtists} imageSources={imageSources} />
        )}
      </div>
    </div>
  )
}
