'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { ArtistMapData, GenreMapData, TimeRange } from '@/lib/types'

export function useGenreMap(range: TimeRange) {
  const { data, error, isLoading } = useSWR<GenreMapData>(
    isAuthenticated() ? ['map/genres', range] : null,
    () => api.fetchGenreMap(range),
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  )
  return { data, error, isLoading }
}

export function useArtistMap(range: TimeRange) {
  const { data, error, isLoading } = useSWR<ArtistMapData>(
    isAuthenticated() ? ['map/artists', range] : null,
    () => api.fetchArtistMap(range),
    { revalidateOnFocus: false, dedupingInterval: 120_000 },
  )
  return { data, error, isLoading }
}
