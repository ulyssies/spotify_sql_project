import { ArtistCard } from './ArtistCard'
import { HorizontalScroller } from '@/components/ui/HorizontalScroller'
import type { Artist } from '@/lib/types'

interface ArtistGridProps {
  artists: Artist[]
}

export function ArtistGrid({ artists }: ArtistGridProps) {
  if (artists.length === 0) {
    return (
      <p className="text-muted text-sm text-center py-16">
        No artists found for this time range.
      </p>
    )
  }

  return (
    <HorizontalScroller className="gap-4">
      {artists.map((artist) => (
        <div key={artist.id} className="w-[88px] shrink-0 sm:w-[96px]">
          <ArtistCard artist={artist} />
        </div>
      ))}
    </HorizontalScroller>
  )
}
