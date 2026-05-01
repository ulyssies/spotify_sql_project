import Image from 'next/image'
import type { Track } from '@/lib/types'

interface GridCardProps {
  track: Track
}

function GridCard({ track }: GridCardProps) {
  return (
    <div className="group cursor-default transition-transform duration-150 hover:scale-[1.02]">
      {/* Album art */}
      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-white/[0.06]">
        {track.album_art_url ? (
          <Image
            src={track.album_art_url}
            alt={track.album_name ?? track.track_name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.06] flex items-center justify-center text-2xl text-white/20">
            ♫
          </div>
        )}

        {/* Rank overlay */}
        <div className="absolute top-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-xs font-mono text-white leading-none">
          {track.rank}
        </div>

        {/* Hover overlay — bottom third */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center px-2 gap-2 overflow-hidden">
          {track.play_count !== null && (
            <span className="text-[10px] font-mono text-white whitespace-nowrap">
              {track.play_count} plays
            </span>
          )}
          {track.popularity !== null && track.popularity >= 70 && (
            <span className="text-[10px] font-mono text-[#1DB954] whitespace-nowrap">
              {track.popularity}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <p className="text-sm font-medium text-white truncate mt-2 leading-tight">
        {track.track_name}
      </p>
      <p className="text-xs text-[#666666] truncate leading-tight">
        {track.artist_name}
      </p>
    </div>
  )
}

interface TrackGridProps {
  tracks: Track[]
}

export function TrackGrid({ tracks }: TrackGridProps) {
  if (tracks.length === 0) {
    return (
      <p className="text-muted text-sm text-center py-16">
        No tracks found for this time range.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {tracks.map((track) => (
        <GridCard key={track.id} track={track} />
      ))}
    </div>
  )
}
