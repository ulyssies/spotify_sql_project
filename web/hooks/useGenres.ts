'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { Genre, TimeRange } from '@/lib/types'

export function useGenres(range: TimeRange) {
  const { data, error, isLoading } = useSWR<Genre[]>(
    isAuthenticated() ? ['genres', range] : null,
    () => api.getGenres(range),
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )
  return { genres: data, error, isLoading }
}
