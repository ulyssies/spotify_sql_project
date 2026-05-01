import type { Track } from '@/lib/types'
import { TrackCard } from './TrackCard'

interface TrackListProps {
  tracks: Track[]
}

export function TrackList({ tracks }: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <p className="text-muted text-sm text-center py-16">
        No tracks found for this time range.
      </p>
    )
  }

  return (
    <div className="space-y-px">
      {tracks.map((track) => (
        <TrackCard key={track.id} track={track} />
      ))}
    </div>
  )
}
