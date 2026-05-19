'use client'

import Image from 'next/image'
import { ExternalLink, Music2, Sparkles } from 'lucide-react'
import type { Recommendation } from '@/lib/types'

interface RecommendationCardProps {
  rec: Recommendation
  index: number
}

export function RecommendationCard({ rec, index }: RecommendationCardProps) {
  const tags = [...(rec.matched_subgenres ?? []), ...(rec.matched_genres ?? [])]
    .filter(Boolean)
    .slice(0, 3)
  const listeningMinutes = Math.round((rec.listening_ms ?? 0) / 60000)
  const exposureLabel = listeningMinutes > 0 ? `${listeningMinutes}m listened` : 'not in history'

  return (
    <article className="group overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-[#151515] transition duration-200 hover:border-white/[0.18] hover:bg-[#1b1b1b]">
      <div className="relative aspect-[1.2] overflow-hidden bg-white/[0.04]">
        {rec.album_art_url ? (
          <Image
            src={rec.album_art_url}
            alt={rec.album_name ?? rec.track_name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted/40">
            <Music2 size={42} strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {index + 1}
        </div>
        {typeof rec.popularity === 'number' && (
          <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white/85 backdrop-blur">
            {rec.popularity}% popularity
          </div>
        )}
        <div className="absolute bottom-4 left-4 rounded-full bg-accent/90 px-3 py-1 text-xs font-bold text-black backdrop-blur">
          {exposureLabel}
        </div>
      </div>

      <div className="flex min-h-[15rem] flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-4 w-4 shrink-0 text-accent" />
          <p className="line-clamp-2 text-sm font-medium leading-relaxed text-white/62">
            {rec.reason ?? 'Popular song matched to your listening graph'}
          </p>
        </div>

        <div>
          <h2 className="line-clamp-2 text-2xl font-bold leading-tight text-white">
            {rec.track_name}
          </h2>
          <p className="mt-2 line-clamp-1 text-lg font-semibold text-white/55">
            {rec.artist_name}
          </p>
          {rec.album_name && (
            <p className="mt-1 line-clamp-1 text-sm text-white/35">{rec.album_name}</p>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/58"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-3">
          {rec.preview_url && (
            <audio
              src={rec.preview_url}
              controls
              preload="none"
              className="h-9 min-w-0 flex-1 opacity-70 transition-opacity hover:opacity-100"
            />
          )}
          {rec.spotify_url && (
            <a
              href={rec.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-black transition hover:scale-105"
              aria-label={`Open ${rec.track_name} in Spotify`}
            >
              <ExternalLink size={17} strokeWidth={2.4} />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
