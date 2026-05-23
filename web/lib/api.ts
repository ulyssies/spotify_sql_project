import { clearToken, getToken } from '@/lib/auth'
import type { Artist, ArtistMapData, ArtistTimelineBucket, ArtistYearStat, Genre, GenreMapData, HistoryPatterns, HistoryStats, HeatmapDay, ImportResult, ImportStatus, MonthStat, NodeYearStat, Recommendation, StreamingHistoryItem, SyncResult, TimeRange, TopArtist, TopTrack, Track, User, YearStat } from '@/lib/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1'

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
    let detail = text
    try {
      const parsed = JSON.parse(text) as { detail?: unknown; message?: unknown }
      detail = String(parsed.detail ?? parsed.message ?? text)
    } catch {
      detail = text
    }

    if (res.status === 429) {
      throw new Error('Spotify is rate limiting requests right now. Wait a minute, then try again.')
    }

    throw new Error(detail || `API request failed with status ${res.status}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  getMe: () =>
    request<User>('/users/me'),

  deleteMe: () =>
    request<{ message: string }>('/users/me', { method: 'DELETE' }),

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

  getHistoryStats: (year?: number) =>
    request<HistoryStats>(`/history/stats${year ? `?year=${year}` : ''}`),

  getHistoryYearly: () =>
    request<YearStat[]>('/history/yearly'),

  getHistoryMonthly: (year: number) =>
    request<MonthStat[]>(`/history/monthly?year=${year}`),

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

  getHistoryArtistYearly: (artistNames: string[], limit = 8) => {
    const params = new URLSearchParams({ limit: String(limit) })
    artistNames.forEach((name) => params.append('artist_names', name))
    return request<ArtistYearStat[]>(`/history/artist-yearly?${params.toString()}`)
  },

  getHistoryNodeYearly: (nodeType: string, label: string, family?: string) => {
    const params = new URLSearchParams({ node_type: nodeType, label })
    if (family) params.set('family', family)
    return request<NodeYearStat[]>(`/history/node-yearly?${params.toString()}`)
  },

  getHistoryArtistTimeline: (artistNames: string[], range: TimeRange, limit = 8) => {
    const params = new URLSearchParams({ time_range: range, limit: String(limit) })
    artistNames.forEach((name) => params.append('artist_names', name))
    return request<ArtistTimelineBucket[]>(`/history/artist-timeline?${params.toString()}`)
  },
}
