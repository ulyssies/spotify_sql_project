'use client'

import Image from 'next/image'
import type { Track } from '@/lib/types'

function formatMinutes(mins: number | null | undefined): string {
  if (!mins) return ''
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

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
        {track.play_count != null && (
          <div className="flex gap-3 mt-1">
            <span className="text-xs font-mono text-[#1DB954]">
              {track.play_count} plays
            </span>
            {formatMinutes(track.minutes_played) && (
              <span className="text-xs font-mono text-[#666]">
                {formatMinutes(track.minutes_played)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* First listened — fades in on hover */}
      {track.first_listened && (
        <span className="text-xs font-mono text-[#555] opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 whitespace-nowrap">
          First played{' '}
          {new Date(track.first_listened).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })}
        </span>
      )}

      {/* Popularity dot — only when no streaming history */}
      {track.play_count === null && track.popularity !== null && track.popularity >= 80 && (
        <span className="w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" title="Trending" />
      )}
    </div>
  )
}
