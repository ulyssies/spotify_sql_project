import Image from 'next/image'
import { CarouselSection } from '@/components/ui/CarouselSection'
import type { TopTrack } from '@/lib/types'

interface HistoryTrackCarouselProps {
  tracks: TopTrack[]
}

function formatMinutes(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes >= 60) {
    const hours = minutes / 60
    return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} hr`
  }
  return `${minutes} min`
}

export function HistoryTrackCarousel({ tracks }: HistoryTrackCarouselProps) {
  return (
    <CarouselSection
      title="Top tracks history"
      subtitle="Your all-time imported listening history"
    >
      {tracks.map((track, index) => (
        <article key={`${track.spotify_track_uri}-${index}`} className="w-[190px] shrink-0">
          <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-white/[0.06]">
            {track.album_art_url ? (
              <Image
                src={track.album_art_url}
                alt={track.track_name}
                fill
                sizes="190px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/[0.06] text-2xl text-white/20">
                ♫
              </div>
            )}
            <div className="absolute left-2 top-2 rounded bg-black/65 px-1.5 py-0.5 font-mono text-xs leading-none text-white">
              {index + 1}
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-[15px] font-bold leading-tight text-white">
            {index + 1}. {track.track_name}
          </p>
          <p className="mt-1 truncate text-sm font-semibold leading-tight text-[#858585]">
            {track.artist_name}
          </p>
          <p className="mt-1 truncate font-mono text-xs text-[#666]">
            {formatMinutes(track.total_ms)} · {track.plays.toLocaleString()} plays
          </p>
        </article>
      ))}
    </CarouselSection>
  )
}
