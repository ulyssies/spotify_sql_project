import Image from 'next/image'
import { CarouselSection } from '@/components/ui/CarouselSection'
import type { Artist, TopArtist } from '@/lib/types'

interface HistoryArtistCarouselProps {
  artists: TopArtist[]
  imageSources?: Artist[]
}

function formatListeningTime(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes >= 60) {
    const hours = minutes / 60
    return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} hr`
  }
  return `${minutes} min`
}

export function HistoryArtistCarousel({ artists, imageSources = [] }: HistoryArtistCarouselProps) {
  const imageByName = new Map<string, string>()
  imageSources.forEach((artist) => {
    if (artist.artist_image_url && !imageByName.has(artist.artist_name.toLowerCase())) {
      imageByName.set(artist.artist_name.toLowerCase(), artist.artist_image_url)
    }
  })

  return (
    <CarouselSection
      title="Top artists history"
      subtitle="Your all-time imported listening history"
    >
      {artists.map((artist, index) => {
        const imageUrl = imageByName.get(artist.artist_name.toLowerCase()) ?? null

        return (
          <article key={`${artist.artist_name}-${index}`} className="w-[190px] shrink-0">
            <div className="relative aspect-square overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.06]">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={artist.artist_name}
                  fill
                  sizes="190px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/[0.06] text-3xl font-bold text-white/25">
                  {artist.artist_name.slice(0, 1)}
                </div>
              )}
            </div>
            <p className="mt-3 truncate text-center text-[15px] font-bold leading-tight text-white">
              {index + 1}. {artist.artist_name}
            </p>
            <p className="mt-1 truncate text-center text-sm font-semibold leading-tight text-[#858585]">
              {formatListeningTime(artist.total_ms)}
            </p>
            <p className="mt-1 truncate text-center font-mono text-xs text-[#666]">
              {artist.plays.toLocaleString()} plays · {artist.unique_tracks} tracks
            </p>
          </article>
        )
      })}
    </CarouselSection>
  )
}
