import Image from 'next/image'
import { HorizontalScroller } from '@/components/ui/HorizontalScroller'
import type { Track } from '@/lib/types'

interface GridCardProps {
  track: Track
}

function GridCard({ track }: GridCardProps) {
  return (
    <div className="group min-w-0 rounded-lg border border-white/[0.08] bg-[#121212] p-2.5 transition-colors duration-150 hover:border-white/[0.18] hover:bg-[#181818]">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-white/[0.06]">
        {track.album_art_url ? (
          <Image
            src={track.album_art_url}
            alt={track.album_name ?? track.track_name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, (max-width: 1536px) 18vw, 13vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.06] text-2xl text-white/20">
            ♫
          </div>
        )}

        <div className="absolute left-2 top-2 rounded bg-black/65 px-1.5 py-0.5 font-mono text-xs leading-none text-white">
          {track.rank}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex h-1/3 items-center gap-2 overflow-hidden bg-black/70 px-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {track.play_count !== null && (
            <span className="whitespace-nowrap font-mono text-[10px] text-white">
              {track.play_count} plays
            </span>
          )}
          {track.popularity !== null && track.popularity >= 70 && (
            <span className="whitespace-nowrap font-mono text-[10px] text-[#1DB954]">
              {track.popularity}
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-[15px] font-bold leading-tight text-white">
        {track.rank}. {track.track_name}
      </p>
      <p className="mt-1 truncate text-sm font-semibold leading-tight text-[#858585]">
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
    <HorizontalScroller className="gap-3 sm:gap-4">
      {tracks.map((track) => (
        <div key={track.id} className="w-[190px] shrink-0 sm:w-[210px]">
          <GridCard track={track} />
        </div>
      ))}
    </HorizontalScroller>
  )
}
