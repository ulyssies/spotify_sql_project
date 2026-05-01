'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { TimeRange, Track } from '@/lib/types'

export function useTracks(range: TimeRange) {
  const { data, error, isLoading, mutate } = useSWR<Track[]>(
    isAuthenticated() ? ['tracks', range] : null,
    () => api.getTracks(range),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )
  return { tracks: data, error, isLoading, mutate }
}
