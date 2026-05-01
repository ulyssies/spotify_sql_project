'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'

const SWR_OPTS = { revalidateOnFocus: false, dedupingInterval: 60_000 }

export function useHistoryStats() {
  return useSWR(
    isAuthenticated() ? 'history/stats' : null,
    () => api.getHistoryStats(),
    SWR_OPTS,
  )
}

export function useHistoryYearly() {
  return useSWR(
    isAuthenticated() ? 'history/yearly' : null,
    () => api.getHistoryYearly(),
    SWR_OPTS,
  )
}

export function useHistoryHeatmap(year?: number) {
  return useSWR(
    isAuthenticated() ? ['history/heatmap', year ?? null] : null,
    () => api.getHistoryHeatmap(year),
    SWR_OPTS,
  )
}

export function useHistoryPatterns() {
  return useSWR(
    isAuthenticated() ? 'history/patterns' : null,
    () => api.getHistoryPatterns(),
    SWR_OPTS,
  )
}

export function useHistoryTopArtists(year?: number, limit = 25) {
  return useSWR(
    isAuthenticated() ? ['history/top-artists', year ?? null, limit] : null,
    () => api.getHistoryTopArtists(year, limit),
    SWR_OPTS,
  )
}

export function useHistoryTopTracks(year?: number, limit = 25) {
  return useSWR(
    isAuthenticated() ? ['history/top-tracks', year ?? null, limit] : null,
    () => api.getHistoryTopTracks(year, limit),
    SWR_OPTS,
  )
}
