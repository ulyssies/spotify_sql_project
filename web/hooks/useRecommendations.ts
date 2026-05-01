'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { Recommendation } from '@/lib/types'

export function useRecommendations() {
  const { data, error, isLoading, mutate } = useSWR<Recommendation[]>(
    isAuthenticated() ? 'recommendations' : null,
    () => api.getRecommendations(),
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  )
  return { recommendations: data, error, isLoading, mutate }
}
