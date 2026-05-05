import { clearToken, getToken } from '@/lib/auth'
import type { Artist, ArtistMapData, Genre, GenreMapData, HistoryPatterns, HistoryStats, HeatmapDay, ImportResult, ImportStatus, Recommendation, StreamingHistoryItem, SyncResult, TimeRange, TopArtist, TopTrack, Track, User, YearStat } from '@/lib/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  getMe: () =>
    request<User>('/users/me'),

  syncTracks: (range: TimeRange) =>
    request<SyncResult>(`/tracks/sync?range=${range}`, { method: 'POST' }),

  getTracks: (range: TimeRange) =>
    request<Track[]>(`/tracks/?range=${range}`),

  getGenres: (range: TimeRange) =>
    request<Genre[]>(`/genres/?range=${range}`),

  getRecommendations: () =>
    request<Recommendation[]>('/recommendations/'),

  syncArtists: (range: TimeRange) =>
    request<SyncResult>(`/artists/sync?range=${range}`, { method: 'POST' }),

  getArtists: (range: TimeRange) =>
    request<Artist[]>(`/artists/?range=${range}`),

  importStreamingHistory: (items: StreamingHistoryItem[]) =>
    request<ImportResult>('/import/streaming-history', {
      method: 'POST',
      body: JSON.stringify(items),
    }),

  getImportStatus: () =>
    request<ImportStatus | null>('/import/status'),

  fetchGenreMap: (range: TimeRange) =>
    request<GenreMapData>(`/map/genres?range=${range}`),

  fetchArtistMap: (range: TimeRange) =>
    request<ArtistMapData>(`/map/artists?range=${range}`),

  getHistoryStats: () =>
    request<HistoryStats>('/history/stats'),

  getHistoryYearly: () =>
    request<YearStat[]>('/history/yearly'),

  getHistoryHeatmap: (year?: number) =>
    request<HeatmapDay[]>(`/history/heatmap${year ? `?year=${year}` : ''}`),

  getHistoryPatterns: () =>
    request<HistoryPatterns>('/history/patterns'),

  getHistoryTopArtists: (year?: number, limit = 25) =>
    request<TopArtist[]>(`/history/top-artists?limit=${limit}${year ? `&year=${year}` : ''}`),

  getHistoryTopTracks: (year?: number, limit = 25) =>
    request<TopTrack[]>(`/history/top-tracks?limit=${limit}${year ? `&year=${year}` : ''}`),

  getHistoryArtistTopTracks: (artistName: string, limit = 25) =>
    request<TopTrack[]>(`/history/artist-top-tracks?artist_name=${encodeURIComponent(artistName)}&limit=${limit}`),
}
