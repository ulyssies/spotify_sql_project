'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useArtists } from '@/hooks/useArtists'
import { ArtistGrid } from '@/components/artists/ArtistGrid'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import type { TimeRange } from '@/lib/types'

function GridSkeleton() {
  return (
    <div className="-mx-1 flex gap-4 overflow-hidden px-1 pb-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex w-[88px] shrink-0 flex-col items-center space-y-2 sm:w-[96px]">
          <Skeleton className="aspect-square w-full rounded-full" />
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

      {artists && <ArtistGrid artists={artists} />}
    </div>
  )
}
