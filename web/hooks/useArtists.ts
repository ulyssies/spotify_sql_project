'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { Artist, TimeRange } from '@/lib/types'

export function useArtists(range: TimeRange) {
  const { data, error, isLoading, mutate } = useSWR<Artist[]>(
    isAuthenticated() ? ['artists', range] : null,
    () => api.getArtists(range),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )
  return { artists: data, error, isLoading, mutate }
}
