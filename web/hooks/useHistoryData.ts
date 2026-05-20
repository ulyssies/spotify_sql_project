'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { TimeRange } from '@/lib/types'

const SWR_OPTS = { revalidateOnFocus: false, dedupingInterval: 60_000 }
type HistoryNodeType = 'root' | 'parent' | 'subgenre' | 'artist'

export function useHistoryStats(year?: number) {
  return useSWR(
    isAuthenticated() ? ['history/stats', year ?? null] : null,
    () => api.getHistoryStats(year),
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

export function useHistoryMonthly(year?: number) {
  return useSWR(
    isAuthenticated() && year ? ['history/monthly', year] : null,
    () => api.getHistoryMonthly(year!),
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

export function useHistoryArtistTopTracks(artistName?: string, limit = 25) {
  return useSWR(
    isAuthenticated() && artistName ? ['history/artist-top-tracks', artistName, limit] : null,
    () => api.getHistoryArtistTopTracks(artistName!, limit),
    SWR_OPTS,
  )
}

export function useHistoryNodeYearly(nodeType?: HistoryNodeType, label?: string, family?: string) {
  return useSWR(
    isAuthenticated() && nodeType && label
      ? ['history/node-yearly', nodeType, label, family ?? null]
      : null,
    () => api.getHistoryNodeYearly(nodeType!, label!, family),
    SWR_OPTS,
  )
}

export function useHistoryArtistYearly(artistNames: string[], limit = 8) {
  const namesKey = artistNames.join('|')
  return useSWR(
    isAuthenticated() && artistNames.length ? ['history/artist-yearly', namesKey, limit] : null,
    () => api.getHistoryArtistYearly(artistNames, limit),
    SWR_OPTS,
  )
}

export function useHistoryArtistTimeline(artistNames: string[], range: TimeRange, limit = 8) {
  const namesKey = artistNames.join('|')
  return useSWR(
    isAuthenticated() && artistNames.length ? ['history/artist-timeline', namesKey, range, limit] : null,
    () => api.getHistoryArtistTimeline(artistNames, range, limit),
    SWR_OPTS,
  )
}
