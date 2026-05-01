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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="space-y-2">
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-syne font-bold text-2xl text-primary">Top Tracks</h1>
          <p className="text-muted text-sm mt-1">
            {range === 'short_term' ? 'Last 4 weeks' : range === 'medium_term' ? 'Last 6 months' : 'All time'}
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
