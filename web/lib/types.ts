export type TimeRange = 'short_term' | 'medium_term' | 'long_term'

export interface User {
  id: string
  spotify_id: string
  display_name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  last_synced_at: string | null
  token_expires_at: string | null
}

export interface Track {
  id: string
  spotify_track_id: string
  track_name: string
  artist_name: string
  album_name: string | null
  album_art_url: string | null
  popularity: number | null
  time_range: TimeRange
  rank: number
  genres: string[] | null
  snapshot_at: string
  play_count: number | null
  minutes_played: number | null
  first_listened: string | null
}

export interface StreamingHistoryItem {
  ts: string
  ms_played: number
  master_metadata_track_name: string
  master_metadata_album_artist_name: string
  master_metadata_album_album_name: string | null
  spotify_track_uri: string
  reason_start?: string
  reason_end?: string
  skipped?: boolean | null
}

export interface ImportResult {
  imported: number
  duplicates_skipped: number
}

export interface ImportStatus {
  total_streams: number
  date_range: { from: string; to: string }
  last_import: string
}

export interface Genre {
  genre: string
  percentage: number
  snapshot_at: string
  other_genres?: string[]
}

export interface Recommendation {
  track_name: string
  artist_name: string
  album_name: string | null
  album_art_url: string | null
  spotify_url: string | null
  preview_url: string | null
  popularity: number | null
}

export interface SyncResult {
  synced: number
  time_range: string
}

export interface ParentGenreNode {
  id: string
  label: string
  family: string
  weight: number
}

export interface GenreNode {
  id: string
  label: string
  weight: number
  family: string
}

export interface ArtistMapNode {
  id: string
  label: string
  image_url: string | null
  rank?: number
  track_count?: number
  genres: string[]
}

export interface TrackNode {
  id: string
  label: string
  album_art_url: string | null
  artist_id: string
}

export interface GenreMapData {
  parent_nodes: ParentGenreNode[]
  genre_nodes: GenreNode[]
  artist_nodes: ArtistMapNode[]
  parent_genre_links: { source: string; target: string }[]
  genre_artist_links: { source: string; target: string }[]
  genre_affinity_links: { source: string; target: string; shared: number }[]
}

export interface ArtistMapData {
  artist_nodes: ArtistMapNode[]
  track_nodes: TrackNode[]
  artist_links: { source: string; target: string; shared_genres: string[]; n: number }[]
}

export interface HistoryStats {
  total_plays: number
  total_ms: number
  unique_artists: number
  unique_tracks: number
  skipped_count: number
  shuffle_count: number
  meaningful_plays: number
  first_played_at: string | null
  last_played_at: string | null
}

export interface YearStat {
  year: number
  plays: number
  total_ms: number
  unique_artists: number
  unique_tracks: number
}

export interface HeatmapDay {
  day: string
  count: number
}

export interface HourPattern {
  hour: number
  count: number
}

export interface DowPattern {
  dow: number
  count: number
}

export interface TopArtist {
  artist_name: string
  plays: number
  total_ms: number
  unique_tracks: number
}

export interface TopTrack {
  track_name: string
  artist_name: string
  spotify_track_uri: string
  plays: number
  total_ms: number
}

export interface HistoryPatterns {
  hours: HourPattern[]
  dow: DowPattern[]
}

export interface Artist {
  id: string
  spotify_artist_id: string
  artist_name: string
  artist_image_url: string | null
  genres: string[]
  popularity: number | null
  followers: number | null
  time_range: TimeRange
  rank: number
  snapshot_at: string
  total_plays?: number | null
  total_minutes?: number | null
}
