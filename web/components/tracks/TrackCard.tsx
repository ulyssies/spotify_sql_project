import Image from 'next/image'
import type { Track } from '@/lib/types'

interface TrackCardProps {
  track: Track
}

export function TrackCard({ track }: TrackCardProps) {
  return (
    <div className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.04] transition-colors duration-100">
      {/* Rank */}
      <span className="w-7 text-right font-mono text-muted text-sm shrink-0 tabular-nums">
        {track.rank}
      </span>

      {/* Album art */}
      <div className="w-12 h-12 rounded shrink-0 bg-white/[0.06] overflow-hidden">
        {track.album_art_url ? (
          <Image
            src={track.album_art_url}
            alt={track.album_name ?? track.track_name}
            width={48}
            height={48}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.06]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-primary font-medium truncate leading-tight">
          {track.track_name}
        </p>
        <p className="text-sm text-muted truncate leading-tight mt-0.5">
          {track.artist_name}
        </p>
      </div>

      {/* Play count + time pills — only shown when streaming history is imported */}
      {track.play_count !== null && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs text-[#666666]">
            {track.play_count} plays
          </span>
          {track.minutes_played !== null && track.minutes_played > 0 && (
            <span className="font-mono text-xs text-[#444]">
              {track.minutes_played >= 60
                ? `${Math.floor(track.minutes_played / 60)}h ${track.minutes_played % 60}m`
                : `${track.minutes_played}m`}
            </span>
          )}
        </div>
      )}

      {/* Popularity dot — subtle signal without cluttering */}
      {track.play_count === null && track.popularity !== null && track.popularity >= 80 && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" title="Trending" />
      )}
    </div>
  )
}
