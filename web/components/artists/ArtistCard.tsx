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
    <div className="group cursor-default transition-transform duration-150 hover:scale-[1.02] flex flex-col items-center">
      {/* Artist image — circular */}
      <div className="relative aspect-square w-full rounded-full overflow-hidden bg-white/[0.06]">
        {artist.artist_image_url ? (
          <Image
            src={artist.artist_image_url}
            alt={artist.artist_name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.06] flex items-center justify-center text-2xl text-white/20">
            ♪
          </div>
        )}

        {/* Rank overlay */}
        <div className="absolute top-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-xs font-mono text-white leading-none">
          {artist.rank}
        </div>

        {/* Hover overlay — bottom third */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center px-2 gap-2 overflow-hidden">
          {artist.total_plays != null ? (
            <>
              <span className="text-[10px] font-mono text-[#1DB954] whitespace-nowrap">
                {artist.total_plays.toLocaleString()} plays
              </span>
              {formatMinutes(artist.total_minutes) && (
                <span className="text-[10px] font-mono text-[#666] whitespace-nowrap">
                  {formatMinutes(artist.total_minutes)}
                </span>
              )}
            </>
          ) : (
            <>
              {artist.popularity !== null && (
                <span className="text-[10px] font-mono text-[#1DB954] whitespace-nowrap">
                  {artist.popularity} pop
                </span>
              )}
              {artist.followers !== null && (
                <span className="text-[10px] font-mono text-white whitespace-nowrap">
                  {formatFollowers(artist.followers)}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <p className="text-sm font-medium text-white truncate mt-2 leading-tight text-center w-full">
        {artist.artist_name}
      </p>
      {topGenre && (
        <p className="text-xs text-[#666666] truncate leading-tight text-center w-full">
          {topGenre}
        </p>
      )}
    </div>
  )
}
