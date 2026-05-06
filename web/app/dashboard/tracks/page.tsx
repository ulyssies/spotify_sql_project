'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTracks } from '@/hooks/useTracks'
import { TrackGrid } from '@/components/tracks/TrackGrid'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import type { TimeRange } from '@/lib/types'

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-white/[0.06] bg-[#121212] p-2.5">
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export default function TracksPage() {
  const searchParams = useSearchParams()
  const range = (searchParams.get('range') ?? 'short_term') as TimeRange
  const { tracks, isLoading, error, mutate } = useTracks(range)
  const [isSyncing, setIsSyncing] = useState(false)

  async function handleSync() {
    setIsSyncing(true)
    try {
      await Promise.all([
        api.syncTracks(range),
        api.syncArtists(range),
      ])
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
          <h1 className="font-syne text-3xl font-bold text-primary">Top tracks</h1>
          <p className="mt-1 text-base font-semibold text-[#8a8a8a]">
            Your top tracks from {rangeLabel}
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

      {error && !tracks && (
        <div className="text-center py-20">
          <p className="text-muted text-sm mb-4">No data yet.</p>
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? 'Syncing...' : 'Sync your Spotify data'}
          </Button>
        </div>
      )}

      {isLoading && !tracks && <GridSkeleton />}

      {tracks && <TrackGrid tracks={tracks} />}
    </div>
  )
}
