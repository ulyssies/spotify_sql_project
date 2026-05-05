'use client'

import Link from 'next/link'
import { useGenreMap } from '@/hooks/useMapData'
import { useTracks } from '@/hooks/useTracks'
import { useHistoryTopTracks, useHistoryYearly } from '@/hooks/useHistoryData'
import { GenreMap } from '@/components/map/GenreMap'
import { Skeleton } from '@/components/ui/Skeleton'
import type { TimeRange } from '@/lib/types'

const MAP_RANGE: TimeRange = 'long_term'

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className={`rounded-full ${i % 4 === 0 ? 'w-10 h-10' : i % 4 === 1 ? 'w-14 h-14' : i % 4 === 2 ? 'w-12 h-12' : 'w-16 h-16'}`} />
          </div>
        ))}
      </div>
      <p className="text-center text-muted text-sm">Building your map...</p>
    </div>
  )
}

function GenreView() {
  const { data, isLoading, error } = useGenreMap(MAP_RANGE)
  const { tracks } = useTracks(MAP_RANGE)
  const { data: yearly } = useHistoryYearly()
  const { data: historyTopTracks } = useHistoryTopTracks(undefined, 100)

  if (isLoading) return <LoadingSkeleton />

  if (error || !data || (!data.genre_nodes.length && !data.artist_nodes.length)) {
    return (
      <div className="text-center py-20">
        <p className="text-muted text-sm mb-4">Sync your tracks first to see your music map.</p>
        <Link href="/dashboard/tracks" className="text-[#1DB954] text-sm hover:underline">
          Go to Top Tracks
        </Link>
      </div>
    )
  }

  return <GenreMap data={data} tracks={tracks ?? []} historyTopTracks={historyTopTracks ?? []} yearly={yearly ?? []} />
}

export default function MapPage() {
  return (
    <div className="h-screen overflow-hidden pb-0 mb-0 flex flex-col">
      <div className="flex shrink-0 flex-row items-center gap-4">
        <h1 className="font-syne font-bold text-xl text-primary mb-[2px]">Music Map</h1>
      </div>

      <div className="relative h-[calc(100vh-80px)] min-h-0 overflow-hidden [&>div]:!h-full [&>div]:min-h-0">
        <GenreView />
      </div>
    </div>
  )
}
