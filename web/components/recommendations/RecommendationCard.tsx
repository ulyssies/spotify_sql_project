'use client'

import Image from 'next/image'
import type { Recommendation } from '@/lib/types'

interface RecommendationCardProps {
  rec: Recommendation
}

export function RecommendationCard({ rec }: RecommendationCardProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden group flex flex-col">
      {/* Album art */}
      <div className="relative aspect-square bg-white/[0.04] overflow-hidden">
        {rec.album_art_url ? (
          <Image
            src={rec.album_art_url}
            alt={rec.album_name ?? rec.track_name}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl text-muted/30">
            ♫
          </div>
        )}
      </div>

      {/* Info + actions */}
      <div className="flex flex-col gap-4 p-4 flex-1">
        <div>
          <p className="text-sm font-medium text-primary truncate leading-snug">
            {rec.track_name}
          </p>
          <p className="text-sm text-muted truncate mt-0.5">{rec.artist_name}</p>
        </div>

        {rec.preview_url && (
          <audio
            src={rec.preview_url}
            controls
            preload="none"
            className="w-full h-8 opacity-60 hover:opacity-100 transition-opacity"
          />
        )}

        {rec.spotify_url && (
          <a
            href={rec.spotify_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto block text-center text-xs font-medium text-accent border border-accent/20 rounded-xl py-2.5 hover:bg-accent/8 hover:border-accent/40 transition-all duration-150"
          >
            Open in Spotify ↗
          </a>
        )}
      </div>
    </div>
  )
}
