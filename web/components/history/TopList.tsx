'use client'

import type { TopArtist, TopTrack } from '@/lib/types'

function msToLabel(ms: number): string {
  const h = Math.round(ms / 3_600_000)
  return h >= 1000 ? `${(h / 1000).toFixed(1)}k h` : `${h}h`
}

interface ArtistsProps {
  data: TopArtist[]
}

export function TopArtistsList({ data }: ArtistsProps) {
  return (
    <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1f1f1f]">
        <p className="text-[#666] text-xs font-medium uppercase tracking-wider">Top Artists</p>
      </div>
      <ul>
        {data.map((a, i) => (
          <li
            key={a.artist_name}
            className="flex items-center gap-3 px-5 py-3 hover:bg-[#161616] transition-colors border-b border-[#141414] last:border-0"
          >
            <span className="text-[#555] text-xs w-5 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{a.artist_name}</p>
              <p className="text-[#555] text-xs">{a.unique_tracks.toLocaleString()} tracks</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[#1DB954] text-sm font-medium">{msToLabel(a.total_ms)}</p>
              <p className="text-[#444] text-xs">{a.plays.toLocaleString()} plays</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface TracksProps {
  data: TopTrack[]
}

export function TopTracksList({ data }: TracksProps) {
  return (
    <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1f1f1f]">
        <p className="text-[#666] text-xs font-medium uppercase tracking-wider">Top Tracks</p>
      </div>
      <ul>
        {data.map((t, i) => (
          <li
            key={`${t.spotify_track_uri}-${i}`}
            className="flex items-center gap-3 px-5 py-3 hover:bg-[#161616] transition-colors border-b border-[#141414] last:border-0"
          >
            <span className="text-[#555] text-xs w-5 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{t.track_name}</p>
              <p className="text-[#555] text-xs truncate">{t.artist_name}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[#1DB954] text-sm font-medium">{t.plays.toLocaleString()}</p>
              <p className="text-[#444] text-xs">plays</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
