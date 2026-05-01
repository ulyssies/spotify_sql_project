import { ArtistCard } from './ArtistCard'
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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </div>
  )
}
