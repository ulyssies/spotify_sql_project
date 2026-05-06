'use client'

import Image from 'next/image'
import type { Artist } from '@/lib/types'

function formatMinutes(mins: number | null | undefined): string {
  if (!mins) return ''
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M followers`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K followers`
  return `${n} followers`
}

interface ArtistCardProps {
  artist: Artist
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const topGenre = artist.genres?.[0] ?? null

  return (
    <div className="group flex min-w-0 flex-col items-center">
      <div className="relative aspect-square w-full overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/[0.06] transition-transform duration-200 group-hover:scale-[1.025]">
        {artist.artist_image_url ? (
          <Image
            src={artist.artist_image_url}
            alt={artist.artist_name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.06] text-2xl text-white/20">
            ♪
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex h-1/3 items-center justify-center gap-1 overflow-hidden bg-black/70 px-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {artist.total_plays != null ? (
            <>
              <span className="whitespace-nowrap font-mono text-[8px] text-[#1DB954]">
                {artist.total_plays.toLocaleString()} plays
              </span>
              {formatMinutes(artist.total_minutes) && (
                <span className="whitespace-nowrap font-mono text-[8px] text-[#b5b5b5]">
                  {formatMinutes(artist.total_minutes)}
                </span>
              )}
            </>
          ) : (
            <>
              {artist.popularity !== null && (
                <span className="whitespace-nowrap font-mono text-[8px] text-[#1DB954]">
                  {artist.popularity} pop
                </span>
              )}
              {artist.followers !== null && (
                <span className="whitespace-nowrap font-mono text-[8px] text-white">
                  {formatFollowers(artist.followers)}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <p className="mt-2 w-full truncate text-center text-[12px] font-bold leading-tight text-white">
        {artist.rank}. {artist.artist_name}
      </p>
      {topGenre && (
        <p className="mt-0.5 w-full truncate text-center text-[11px] font-semibold leading-tight text-[#858585]">
          {topGenre}
        </p>
      )}
    </div>
  )
}
