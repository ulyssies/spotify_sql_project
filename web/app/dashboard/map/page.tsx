'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useGenreMap, useArtistMap } from '@/hooks/useMapData'
import { GenreMap } from '@/components/map/GenreMap'
import { ArtistWeb } from '@/components/map/ArtistWeb'
import { Skeleton } from '@/components/ui/Skeleton'
import type { TimeRange } from '@/lib/types'

type Tab = 'genre' | 'artist'

const TAB_META: Record<Tab, { label: string }> = {
  genre: { label: 'Genre Map' },
  artist: { label: 'Artist Web' },
}

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

function GenreView({ range }: { range: TimeRange }) {
  const { data, isLoading, error } = useGenreMap(range)

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

  return <GenreMap data={data} />
}

function ArtistView({ range }: { range: TimeRange }) {
  const { data, isLoading, error } = useArtistMap(range)

  if (isLoading) return <LoadingSkeleton />

  if (error || !data || !data.artist_nodes.length) {
    return (
      <div className="text-center py-20">
        <p className="text-muted text-sm mb-4">Sync your tracks first to see your music map.</p>
        <Link href="/dashboard/tracks" className="text-[#1DB954] text-sm hover:underline">
          Go to Top Tracks
        </Link>
      </div>
    )
  }

  return <ArtistWeb data={data} />
}

export default function MapPage() {
  const searchParams = useSearchParams()
  const range = (searchParams.get('range') ?? 'short_term') as TimeRange
  const [activeTab, setActiveTab] = useState<Tab>('genre')

  return (
    <div className="h-screen overflow-hidden pb-0 mb-0 flex flex-col">
      <div className="flex shrink-0 flex-row items-center gap-4">
        <h1 className="font-syne font-bold text-xl text-primary mb-[2px]">Music Map</h1>
        <div className="flex gap-2">
          {(['genre', 'artist'] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                'px-2 py-1 rounded-full text-sm font-medium transition-colors duration-150',
                activeTab === tab
                  ? 'bg-[#1DB954] text-black'
                  : 'bg-[#1f1f1f] text-[#666666] hover:text-white hover:bg-[#2a2a2a]',
              ].join(' ')}
            >
              {TAB_META[tab].label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[calc(100vh-80px)] min-h-0 overflow-hidden [&>div]:!h-full [&>div]:min-h-0">
        {activeTab === 'genre' && <GenreView range={range} />}
        {activeTab === 'artist' && <ArtistView range={range} />}
      </div>
    </div>
  )
}
