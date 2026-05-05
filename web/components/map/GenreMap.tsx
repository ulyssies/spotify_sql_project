'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { useHistoryArtistTopTracks } from '@/hooks/useHistoryData'
import type { GenreMapData, TopTrack, Track, YearStat } from '@/lib/types'

interface Props {
  data: GenreMapData
  tracks?: Track[]
  historyTopTracks?: TopTrack[]
  yearly?: YearStat[]
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string; label: string; nodeType: 'parent' | 'subgenre' | 'artist'
  r: number; weight?: number; family?: string; play_count?: number; genres?: string[]
  signal?: number; rank?: number
  ringTarget?: number; ringInner?: number; ringOuter?: number
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  type: 'parent-subgenre' | 'genre-artist' | 'affinity'
  shared?: number; sameFamily?: boolean
}

const FAMILY_COLORS: Record<string, string> = {
  'hip-hop':    '#ef4444',
  'r-and-b':    '#f59e0b',
  'pop':        '#f472b6',
  'rock':       '#60a5fa',
  'indie':      '#818cf8',
  'electronic': '#22d3ee',
  'folk':       '#84cc16',
  'jazz':       '#a78bfa',
  'classical':  '#e879f9',
  'dream':      '#2dd4bf',
  'latin':      '#fb923c',
  'reggae':     '#facc15',
}

const FAMILY_HUE: Record<string, number> = {
  'hip-hop': 0, 'latin': 24, 'r-and-b': 38, 'reggae': 48,
  'folk': 79, 'dream': 172, 'electronic': 189, 'rock': 213,
  'indie': 234, 'jazz': 259, 'classical': 291, 'pop': 325,
}

function familyColor(family: string | undefined): string {
  return FAMILY_COLORS[family ?? ''] ?? '#6b7280'
}

// Append two-digit hex alpha to a 6-digit hex color
function withAlpha(hex: string, alpha: number): string {
  return hex + Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')
}

function getGenreOpacity(weight: number, maxWeight: number): number {
  const ratio = weight / maxWeight
  if (ratio >= 0.7) return 1.0
  if (ratio >= 0.4) return 0.75
  if (ratio >= 0.2) return 0.5
  return 0.35
}

function getGenreStrokeOpacity(weight: number, maxWeight: number): number {
  const ratio = weight / maxWeight
  if (ratio >= 0.7) return 0.9
  if (ratio >= 0.4) return 0.5
  return 0.25
}

function getGenreLabelOpacity(weight: number, maxWeight: number): number {
  return 0.4 + (weight / maxWeight) * 0.6
}

function getSignalOpacity(signal = 0): number {
  return 0.34 + signal * 0.66
}

function getSubgenreOpacity(signal = 0): number {
  return 0.76 + signal * 0.24
}

function normalizeGenreKey(genre: string): string {
  return genre.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '')
}

function isParentEquivalentSubgenre(genre: string, family: string): boolean {
  const key = normalizeGenreKey(genre)
  if (family === 'hip-hop') return key === 'hiphop'
  if (family === 'r-and-b') return key === 'rnb' || key === 'randb' || key === 'rhythmandblues'
  return key === normalizeGenreKey(family)
}

function formatListeningTime(ms = 0): string {
  const minutes = Math.round(ms / 60000)
  if (minutes >= 60) {
    const hours = minutes / 60
    return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} hr`
  }
  return `${minutes} min`
}

function getDominantGenreId(genres: string[] | undefined, weightByGenreId: Map<string, number>): string {
  if (!genres?.length) return ''
  return genres.reduce((best, g) =>
    (weightByGenreId.get(g) ?? 0) > (weightByGenreId.get(best) ?? 0) ? g : best,
  genres[0])
}

function clampToRing(
  node: SimNode,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
) {
  const dx = (node.x ?? cx) - cx
  const dy = (node.y ?? cy) - cy
  const distance = Math.sqrt(dx * dx + dy * dy) || 1
  const inner = innerRadius + node.r
  const outer = Math.max(inner, outerRadius - node.r)
  const clampedDistance = Math.max(inner, Math.min(outer, distance))

  if (clampedDistance !== distance) {
    node.x = cx + (dx / distance) * clampedDistance
    node.y = cy + (dy / distance) * clampedDistance
    node.vx = (node.vx ?? 0) * 0.55
    node.vy = (node.vy ?? 0) * 0.55
  }
}

function seededUnit(id: string, salt: number): number {
  let hash = 2166136261 + salt
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 10000) / 10000
}

function createAngularForce(
  cx: number, cy: number,
  nodeAngles: Map<string, { angle: number; strength: number }>,
): d3.Force<SimNode, SimLink> {
  let nodes: SimNode[]
  return Object.assign(
    function (alpha: number) {
      for (const node of nodes) {
        const target = nodeAngles.get(node.id)
        if (!target) continue
        const dx = (node.x ?? cx) - cx
        const dy = (node.y ?? cy) - cy
        const currentAngle = Math.atan2(dy, dx)
        let diff = target.angle - currentAngle
        while (diff > Math.PI)  diff -= 2 * Math.PI
        while (diff < -Math.PI) diff += 2 * Math.PI
        node.vx = (node.vx ?? 0) + (-dy) * diff * target.strength * alpha
        node.vy = (node.vy ?? 0) + dx   * diff * target.strength * alpha
      }
    },
    { initialize(n: SimNode[]) { nodes = n } },
  )
}

function createSoftBoundaryForce(
  cx: number, cy: number, radius: number, strength = 0.12,
): d3.Force<SimNode, SimLink> {
  let nodes: SimNode[]
  return Object.assign(
    function () {
      for (const node of nodes) {
        if (node.nodeType === 'artist') continue
        const dx   = (node.x ?? cx) - cx
        const dy   = (node.y ?? cy) - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const limit = radius - (node.r || 5)
        if (dist > limit && dist > 0) {
          const overshoot = dist - limit
          node.vx = (node.vx ?? 0) - (dx / dist) * overshoot * strength
          node.vy = (node.vy ?? 0) - (dy / dist) * overshoot * strength
        }
      }
    },
    { initialize(n: SimNode[]) { nodes = n } },
  )
}

export function GenreMap({ data, tracks = [], historyTopTracks = [], yearly = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const tooltipRef   = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 800, height: 600 })
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null)
  const transformRef    = useRef(d3.zoomIdentity)
  const relevantIdsRef  = useRef<Set<string> | null>(null)
  const hoveredNodeRef  = useRef<SimNode | null>(null)
  const pinnedNodeRef   = useRef<SimNode | null>(null)
  const redrawRef       = useRef<(() => void) | null>(null)
  const selectedArtistName = selectedNode?.nodeType === 'artist' ? selectedNode.label : undefined
  const { data: selectedArtistTopTracks = [] } = useHistoryArtistTopTracks(selectedArtistName, 25)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDims({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Memoize everything that depends only on data, not on canvas dimensions ──
  const graphData = useMemo(() => {
    const rawParentNodes = data.parent_nodes ?? []
    if (!data.genre_nodes.length && !data.artist_nodes.length) return null

    const totalParentMs = rawParentNodes.reduce((sum, p) => sum + p.total_ms, 0)
    const maxParentMs = Math.max(...rawParentNodes.map((p) => p.total_ms), 1)
    const significantFamilies = new Set(
      rawParentNodes
        .filter((p) => p.total_ms >= totalParentMs * 0.025 && p.total_ms >= maxParentMs * 0.08)
        .map((p) => p.family),
    )

    let parentNodes = rawParentNodes.filter((p) => significantFamilies.has(p.family))
    if (!parentNodes.length) {
      parentNodes = [...rawParentNodes].sort((a, b) => b.total_ms - a.total_ms).slice(0, 6)
      significantFamilies.clear()
      parentNodes.forEach((p) => significantFamilies.add(p.family))
    }
    const rawGenreFamilyMap = new Map(data.genre_nodes.map((g) => [g.id, g.family]))
    const maxGenreMsByFamily = new Map<string, number>()
    data.genre_nodes.forEach((g) => {
      if (!significantFamilies.has(g.family)) return
      maxGenreMsByFamily.set(g.family, Math.max(maxGenreMsByFamily.get(g.family) ?? 0, g.total_ms))
    })
    const genreNodes = data.genre_nodes.filter((g) => {
      const familyMax = maxGenreMsByFamily.get(g.family) ?? 0
      return significantFamilies.has(g.family)
        && !isParentEquivalentSubgenre(g.id, g.family)
        && g.total_ms >= familyMax * 0.045
    })

    const parentMsValues   = parentNodes.map((p) => p.total_ms)
    const subgenreMsValues = genreNodes.map((g) => g.total_ms)
    const artistMsValues   = data.artist_nodes.map((a) => a.total_ms ?? 0)
    const maxSubgenreMs    = Math.max(...subgenreMsValues, 1)
    const maxParentMsKept  = Math.max(...parentMsValues, 1)
    const maxArtistMs      = Math.max(...artistMsValues, 1)

    const scaleParent   = d3.scaleSqrt().domain([Math.min(...parentMsValues),   maxParentMsKept]).range([20, 46]).clamp(true)
    const scaleSubgenre = d3.scaleSqrt().domain([Math.min(...subgenreMsValues), maxSubgenreMs]).range([7, 24]).clamp(true)
    const scaleArtist   = d3.scalePow().exponent(0.45).domain([Math.min(...artistMsValues), maxArtistMs]).range([2.4, 15]).clamp(true)

    const weightByGenreId = new Map(genreNodes.map((g) => [g.id, g.total_ms]))
    const genreFamilyMap  = new Map(genreNodes.map((g) => [g.id, g.family]))

    const parentSimNodes: SimNode[] = parentNodes.map((p) => ({
      id: p.id, label: p.label, nodeType: 'parent',
      r: scaleParent(p.total_ms), weight: p.total_ms, family: p.family,
      signal: p.total_ms / maxParentMsKept,
    }))

    const subgenreSimNodes: SimNode[] = genreNodes.map((g) => ({
      id: g.id, label: g.label, nodeType: 'subgenre',
      r: scaleSubgenre(g.total_ms), weight: g.total_ms, family: g.family,
      signal: g.total_ms / maxSubgenreMs,
    }))

    // Family fallback for orphaned artists whose subgenres were all filtered out —
    // extract the family from the parent_artist_link source ("parent:r-and-b" → "r-and-b")
    const orphanFamilyMap = new Map<string, string>()
    ;(data.parent_artist_links ?? []).forEach((l) => {
      const family = l.source.replace('parent:', '')
      if (significantFamilies.has(family)) orphanFamilyMap.set(l.target, family)
    })

    const artistRanks = new Map(
      [...data.artist_nodes]
        .sort((a, b) => (b.total_ms ?? 0) - (a.total_ms ?? 0))
        .map((a, index) => [a.id, index + 1]),
    )

    const artistSimNodes: SimNode[] = data.artist_nodes.flatMap((a) => {
      const keptGenres = (a.genres ?? []).filter((g) => genreFamilyMap.has(g))
      const rawFamilyCounts = new Map<string, number>()
      for (const g of (a.genres ?? [])) {
        const fam = rawGenreFamilyMap.get(g)
        if (fam && significantFamilies.has(fam)) rawFamilyCounts.set(fam, (rawFamilyCounts.get(fam) ?? 0) + 1)
      }
      const fallbackFamily = Array.from(rawFamilyCounts.entries()).sort((x, y) => y[1] - x[1])[0]?.[0]
      if (!keptGenres.length && !orphanFamilyMap.has(a.id) && !fallbackFamily) return []
      const familyCounts = new Map<string, number>()
      for (const g of keptGenres) {
        const fam = genreFamilyMap.get(g)
        if (fam) familyCounts.set(fam, (familyCounts.get(fam) ?? 0) + 1)
      }
      const dominantFamily = Array.from(familyCounts.entries()).sort((x, y) => y[1] - x[1])[0]?.[0]
        ?? orphanFamilyMap.get(a.id)
        ?? fallbackFamily
        ?? 'other'
      return {
        id: a.id, label: a.label, nodeType: 'artist' as const,
        r: scaleArtist(a.total_ms ?? 0), play_count: a.play_count, genres: keptGenres,
        weight: a.total_ms ?? 0, signal: (a.total_ms ?? 0) / maxArtistMs, rank: artistRanks.get(a.id),
        family: dominantFamily,
      }
    })

    // Sector layout
    const presentFamilies = Array.from(new Set(parentSimNodes.map((p) => p.family ?? 'other')))
    presentFamilies.sort((a, b) => (FAMILY_HUE[a] ?? 350) - (FAMILY_HUE[b] ?? 350))
    const numFamilies = Math.max(presentFamilies.length, 1)
    const sectorWidth = (2 * Math.PI) / numFamilies
    const familyCenterAngles = new Map(presentFamilies.map((fam, i) => [fam, -Math.PI / 2 + i * sectorWidth]))

    const nodeAngles = new Map<string, { angle: number; strength: number }>()
    parentSimNodes.forEach((p) =>
      nodeAngles.set(p.id, { angle: familyCenterAngles.get(p.family ?? 'other') ?? 0, strength: 0.04 }),
    )
    const familySubgenres = new Map<string, SimNode[]>()
    subgenreSimNodes.forEach((sg) => {
      const fam = sg.family ?? 'other'
      if (!familySubgenres.has(fam)) familySubgenres.set(fam, [])
      familySubgenres.get(fam)!.push(sg)
    })
    familySubgenres.forEach((sgs, family) => {
      const centerAngle    = familyCenterAngles.get(family) ?? 0
      const n              = sgs.length
      const spreadFraction = n <= 1 ? 0 : Math.min(0.66, 0.16 + n * 0.028)
      const spread         = sectorWidth * spreadFraction
      ;[...sgs].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).forEach((sg, j) => {
        const angle = n <= 1 ? centerAngle : centerAngle - spread / 2 + (j / (n - 1)) * spread
        nodeAngles.set(sg.id, { angle, strength: 0.075 })
      })
    })

    artistSimNodes.forEach((artist) => {
      const dominantGenre = getDominantGenreId(artist.genres, weightByGenreId)
      const genreTarget = nodeAngles.get(dominantGenre)
      const familyTarget = familyCenterAngles.get(artist.family ?? 'other')
      const baseAngle = genreTarget?.angle ?? familyTarget ?? Math.random() * 2 * Math.PI
      nodeAngles.set(artist.id, {
        angle: baseAngle,
        strength: genreTarget ? 0.038 : 0.028,
      })
    })

    // D3 forceLink throws if a link references a filtered-out node.
    const nodeIds = new Set([
      ...parentSimNodes.map((n) => n.id),
      ...subgenreSimNodes.map((n) => n.id),
      ...artistSimNodes.map((n) => n.id),
    ])
    const hasBothEndpoints = (link: { source: string; target: string }) =>
      nodeIds.has(link.source) && nodeIds.has(link.target)

    // Links
    const parentSubgenreLinks: SimLink[] = (data.parent_genre_links ?? [])
      .filter(hasBothEndpoints)
      .map((l) => ({ source: l.source, target: l.target, type: 'parent-subgenre' as const }))
    const genreArtistLinks: SimLink[]    = [
      ...data.genre_artist_links.filter(hasBothEndpoints).map((l) => ({ source: l.source, target: l.target, type: 'genre-artist' as const })),
      ...(data.parent_artist_links ?? []).filter(hasBothEndpoints).map((l) => ({ source: l.source, target: l.target, type: 'genre-artist' as const })),
      ...artistSimNodes
        .filter((artist) => !artist.genres?.length)
        .map((artist) => ({ source: `parent:${artist.family}`, target: artist.id }))
        .filter(hasBothEndpoints)
        .map((l) => ({ source: l.source, target: l.target, type: 'genre-artist' as const })),
    ]
    const clusterLinks: SimLink[] = data.genre_affinity_links
      .filter((l) => hasBothEndpoints(l) && genreFamilyMap.get(l.source) === genreFamilyMap.get(l.target))
      .map((l) => ({ source: l.source, target: l.target, type: 'affinity' as const, shared: l.shared, sameFamily: true }))
    const allSimLinks = [...parentSubgenreLinks, ...genreArtistLinks, ...clusterLinks]

    // Neighbour map for hover
    const connected = new Map<string, Set<string>>()
    allSimLinks.forEach((l) => {
      const s = typeof l.source === 'object' ? (l.source as SimNode).id : (l.source as string)
      const t = typeof l.target === 'object' ? (l.target as SimNode).id : (l.target as string)
      if (!connected.has(s)) connected.set(s, new Set())
      if (!connected.has(t)) connected.set(t, new Set())
      connected.get(s)!.add(t)
      connected.get(t)!.add(s)
    })

    const parentSubgenreMap = new Map<string, string[]>()
    parentSubgenreLinks.forEach((l) => {
      const source = l.source as string
      const target = l.target as string
      if (!parentSubgenreMap.has(source)) parentSubgenreMap.set(source, [])
      parentSubgenreMap.get(source)!.push(target)
    })
    const genreArtistsMap = new Map<string, string[]>()
    genreArtistLinks.forEach((l) => {
      if (l.type !== 'genre-artist' || String(l.source).startsWith('parent:')) return
      const source = l.source as string
      const target = l.target as string
      if (!genreArtistsMap.has(source)) genreArtistsMap.set(source, [])
      genreArtistsMap.get(source)!.push(target)
    })
    const parentByFamily = new Map(parentSimNodes.map((p) => [p.family ?? 'other', p.id]))
    const artistsByFamily = new Map<string, string[]>()
    artistSimNodes.forEach((artist) => {
      const family = artist.family ?? 'other'
      if (!artistsByFamily.has(family)) artistsByFamily.set(family, [])
      artistsByFamily.get(family)!.push(artist.id)
    })

    return {
      parentSimNodes, subgenreSimNodes, artistSimNodes,
      parentSubgenreLinks, genreArtistLinks, allSimLinks,
      connected, parentSubgenreMap, genreArtistsMap, parentByFamily, artistsByFamily,
      genreFamilyMap, nodeAngles, familyCenterAngles, sectorWidth, maxSubgenreMs, weightByGenreId,
    }
  }, [data])

  const detailData = useMemo(() => {
    if (!selectedNode || !graphData) return null
    const {
      parentSimNodes, subgenreSimNodes, artistSimNodes,
      parentSubgenreMap, genreArtistsMap, genreFamilyMap,
    } = graphData

    const artistById = new Map(artistSimNodes.map((artist) => [artist.id, artist]))
    const selectedArtists = (() => {
      if (selectedNode.nodeType === 'artist') return [selectedNode]
      if (selectedNode.nodeType === 'parent') {
        return artistSimNodes.filter((artist) => artist.family === selectedNode.family)
      }
      return (genreArtistsMap.get(selectedNode.id) ?? [])
        .map((artistId) => artistById.get(artistId))
        .filter((artist): artist is SimNode => Boolean(artist))
    })()

    const topArtists = [...selectedArtists]
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .slice(0, 8)

    const familyForGenre = (genre: string) => genreFamilyMap.get(genre)
    const trackMatchesSelection = (track: Track) => {
      const genres = track.genres ?? []
      if (selectedNode.nodeType === 'artist') {
        return track.artist_name.toLowerCase() === selectedNode.label.toLowerCase()
      }
      if (selectedNode.nodeType === 'subgenre') {
        return genres.includes(selectedNode.id)
      }
      return genres.some((genre) => familyForGenre(genre) === selectedNode.family)
    }

    const selectedArtistNames = new Set(selectedArtists.map((artist) => artist.label.toLowerCase()))
    const historyTrackMatchesSelection = (track: TopTrack) => {
      if (selectedNode.nodeType === 'artist') {
        return track.artist_name.toLowerCase() === selectedNode.label.toLowerCase()
      }
      return selectedArtistNames.has(track.artist_name.toLowerCase())
    }

    const normalizedTracks = [
      ...tracks.filter(trackMatchesSelection).map((track) => ({
        id: track.spotify_track_id,
        name: track.track_name,
        artist: track.artist_name,
        albumArt: track.album_art_url,
        minutes: track.minutes_played ?? 0,
        plays: track.play_count ?? 0,
        rank: track.rank,
      })),
      ...(selectedNode.nodeType === 'artist' ? selectedArtistTopTracks : historyTopTracks)
        .filter(historyTrackMatchesSelection)
        .map((track, index) => ({
        id: track.spotify_track_uri,
        name: track.track_name,
        artist: track.artist_name,
        albumArt: track.album_art_url ?? null,
        minutes: Math.round(track.total_ms / 60000),
        plays: track.plays,
        rank: 1000 + index,
      })),
    ]
    const dedupedTracks = new Map<string, typeof normalizedTracks[number]>()
    normalizedTracks.forEach((track) => {
      const key = `${track.name.toLowerCase()}::${track.artist.toLowerCase()}`
      const current = dedupedTracks.get(key)
      if (!current || track.minutes > current.minutes || (!current.albumArt && track.albumArt)) {
        dedupedTracks.set(key, { ...current, ...track, albumArt: current?.albumArt ?? track.albumArt })
      }
    })
    const topTracks = Array.from(dedupedTracks.values())
      .sort((a, b) =>
        b.minutes - a.minutes
        || b.plays - a.plays
        || a.rank - b.rank,
      )
      .slice(0, 8)

    const subgenreMix = (() => {
      if (selectedNode.nodeType === 'subgenre') {
        return [{ id: selectedNode.id, label: selectedNode.label, value: selectedNode.weight ?? 0, percent: 100, color: familyColor(selectedNode.family) }]
      }
      const subgenreIds = selectedNode.nodeType === 'parent'
        ? (parentSubgenreMap.get(selectedNode.id) ?? [])
        : selectedNode.genres ?? []
      const items = subgenreIds
        .map((id) => subgenreSimNodes.find((node) => node.id === id))
        .filter((node): node is SimNode => Boolean(node))
        .map((node) => ({
          id: node.id,
          label: node.label,
          value: selectedNode.nodeType === 'artist' ? 1 : node.weight ?? 0,
          color: familyColor(node.family),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
      const total = items.reduce((sum, item) => sum + item.value, 0) || 1
      return items.map((item) => ({ ...item, percent: Math.round((item.value / total) * 100) }))
    })()

    const totalParentMs = parentSimNodes.reduce((sum, node) => sum + (node.weight ?? 0), 0) || 1
    const selectedMs = selectedNode.weight ?? topArtists.reduce((sum, node) => sum + (node.weight ?? 0), 0)
    const share = Math.max(0.03, Math.min(0.85, selectedMs / totalParentMs))
    const yearBars = yearly
      .slice()
      .sort((a, b) => a.year - b.year)
      .map((year) => ({
        year: year.year,
        ms: Math.round(year.total_ms * share),
      }))

    const subgenreCount = selectedNode.nodeType === 'parent'
      ? (parentSubgenreMap.get(selectedNode.id) ?? []).length
      : selectedNode.nodeType === 'subgenre'
        ? 1
        : selectedNode.genres?.length ?? 0

    return {
      color: familyColor(selectedNode.family),
      selectedMs,
      subgenreCount,
      artistCount: selectedArtists.length,
      artistRank: selectedNode.nodeType === 'artist' ? selectedNode.rank : undefined,
      topArtists,
      topTracks,
      subgenreMix,
      subgenreMixIsEstimated: selectedNode.nodeType === 'artist',
      yearBars,
    }
  }, [selectedNode, graphData, tracks, historyTopTracks, selectedArtistTopTracks, yearly])

  // ── Canvas rendering effect — reruns on data change or resize ───────────────
  useEffect(() => {
    const canvas  = canvasRef.current!
    const tooltip = tooltipRef.current!
    if (!canvasRef.current || !tooltipRef.current || !graphData) return

    const {
      parentSimNodes, subgenreSimNodes, artistSimNodes,
      parentSubgenreLinks, genreArtistLinks, allSimLinks,
      connected, parentSubgenreMap, genreArtistsMap, parentByFamily, artistsByFamily,
      nodeAngles, familyCenterAngles, sectorWidth, maxSubgenreMs, weightByGenreId,
    } = graphData

    // Scale canvas for device pixel ratio
    const dpr = window.devicePixelRatio || 1
    const { width, height } = dims
    canvas.width  = width  * dpr
    canvas.height = height * dpr
    canvas.style.width  = `${width}px`
    canvas.style.height = `${height}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const cx = width * 0.54
    const cy = height * 0.52
    const boundaryRadius  = Math.min(width * 0.45, height * 0.49)
    const parentRing      = { inner: 0, outer: boundaryRadius * 0.29, target: boundaryRadius * 0.18 }
    const subgenreRing    = { inner: boundaryRadius * 0.36, outer: boundaryRadius * 0.62, target: boundaryRadius * 0.48 }
    const artistRing      = { inner: boundaryRadius * 0.50, outer: boundaryRadius * 1.04, target: boundaryRadius * 0.78 }

    const nodes: SimNode[] = [...parentSimNodes, ...subgenreSimNodes, ...artistSimNodes]

    // Reset velocities and set initial positions from radial targets
    nodes.forEach((node) => {
      node.vx = 0; node.vy = 0
      const target  = nodeAngles.get(node.id)
      const baseTargetR = node.nodeType === 'parent'
        ? parentRing.target
        : node.nodeType === 'subgenre'
          ? subgenreRing.target
          : artistRing.target
      const targetWave = target
        ? Math.sin(target.angle * 2.6 + 0.8) * 0.09 + Math.sin(target.angle * 5.1 + 1.9) * 0.055
        : 0
      const blobOffset = node.nodeType === 'artist'
        ? boundaryRadius * ((seededUnit(node.id, 11) - 0.74) * 0.48 + targetWave * 1.35)
        : node.nodeType === 'subgenre'
          ? (seededUnit(node.id, 17) - 0.5) * boundaryRadius * 0.08
          : (seededUnit(node.id, 23) - 0.5) * boundaryRadius * 0.04
      const targetR = baseTargetR + blobOffset
      node.ringTarget = targetR
      if (node.nodeType === 'artist') {
        const innerRatio = 0.46 + seededUnit(node.id, 31) * 0.22
        const outerRatio = 0.72 + seededUnit(node.id, 37) * 0.27 + targetWave * 1.25
        const outerBump = seededUnit(node.id, 41) > 0.82 ? seededUnit(node.id, 43) * 0.06 : 0
        node.ringInner = boundaryRadius * Math.min(innerRatio, outerRatio - 0.12)
        node.ringOuter = boundaryRadius * Math.max(0.64, Math.min(1.04, outerRatio + outerBump))
      } else {
        node.ringInner = node.nodeType === 'parent' ? parentRing.inner : subgenreRing.inner
        node.ringOuter = node.nodeType === 'parent' ? parentRing.outer : subgenreRing.outer
      }
      let angle: number
      if (target) {
        const jitter = node.nodeType === 'artist' ? sectorWidth * 1.02 : node.nodeType === 'subgenre' ? sectorWidth * 0.26 : sectorWidth * 0.18
        angle = target.angle + (Math.random() - 0.5) * jitter
      } else {
        const dom = getDominantGenreId(node.genres, weightByGenreId)
        angle = nodeAngles.get(dom)?.angle ?? Math.random() * 2 * Math.PI
        angle += (Math.random() - 0.5) * sectorWidth * 0.5
      }
      const radialJitter = node.nodeType === 'artist' ? 0.78 : node.nodeType === 'subgenre' ? 0.08 : 0.06
      node.x = cx + Math.cos(angle) * targetR * (1 - radialJitter / 2 + Math.random() * radialJitter)
      node.y = cy + Math.sin(angle) * targetR * (1 - radialJitter / 2 + Math.random() * radialJitter)
    })

    // ── Draw ──────────────────────────────────────────────────────────────────
    function draw() {
      const tf          = transformRef.current
      const relevantIds = relevantIdsRef.current
      const hoveredNode = hoveredNodeRef.current

      const dim = (id: string) => relevantIds === null ? 1 : relevantIds.has(id) ? 1 : 0.05

      function drawNodeLabel(
        label: string,
        x: number,
        y: number,
        maxWidth: number,
        baseSize: number,
        alpha: number,
      ) {
        let fontSize = baseSize
        ctx.font = `700 ${fontSize}px sans-serif`
        while (ctx.measureText(label).width > maxWidth && fontSize > 7) {
          fontSize -= 1
          ctx.font = `700 ${fontSize}px sans-serif`
        }
        ctx.globalAlpha = alpha
        ctx.lineWidth = Math.max(1.6, fontSize * 0.18)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)'
        ctx.strokeText(label, x, y)
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
        ctx.shadowBlur = 7
        ctx.fillText(label, x, y)
        ctx.shadowBlur = 0
      }

      function parentSubgenreAlpha(source: SimNode, target: SimNode): number {
        if (!hoveredNode) return 1
        if (hoveredNode.nodeType === 'parent') {
          return source.id === hoveredNode.id ? 0.8 : 0.02
        }
        if (hoveredNode.nodeType === 'subgenre') {
          return target.id === hoveredNode.id ? 0.55 : 0.02
        }
        return hoveredNode.genres?.includes(target.id) && source.family === hoveredNode.family ? 0.9 : 0.02
      }

      function parentSubgenreColorAlpha(source: SimNode, target: SimNode): number {
        if (hoveredNode?.nodeType === 'artist' && hoveredNode.genres?.includes(target.id) && source.family === hoveredNode.family) {
          return 0.72
        }
        return 0.21
      }

      function genreArtistAlpha(source: SimNode, target: SimNode): number {
        if (!hoveredNode) return 0.08
        if (hoveredNode.nodeType === 'parent') {
          return target.family === hoveredNode.family ? 0.18 : 0.01
        }
        if (hoveredNode.nodeType === 'artist') {
          return target.id === hoveredNode.id ? 0.85 : 0.01
        }
        if (hoveredNode.nodeType === 'subgenre') {
          return source.id === hoveredNode.id ? 0.5 : 0.01
        }
        return 0.012
      }

      function drawNodeHue(node: SimNode, baseMultiplier: number, activeMultiplier = 1, alphaScale = 1) {
        const signal = node.signal ?? 0
        const isActive = relevantIds === null || relevantIds.has(node.id)
        const color = familyColor(node.family)
        const glowRadius = node.r * baseMultiplier * (1 + signal * 0.55)
        const alphaBoost = isActive ? activeMultiplier : 0.22
        const innerAlpha = (0.035 + signal * 0.075) * alphaBoost * alphaScale
        const midAlpha = (0.018 + signal * 0.035) * alphaBoost * alphaScale
        const gradient = ctx.createRadialGradient(
          node.x ?? 0, node.y ?? 0, node.r * 0.4,
          node.x ?? 0, node.y ?? 0, glowRadius,
        )
        gradient.addColorStop(0, withAlpha(color, innerAlpha))
        gradient.addColorStop(0.46, withAlpha(color, midAlpha))
        gradient.addColorStop(1, withAlpha(color, 0))
        ctx.beginPath()
        ctx.arc(node.x ?? 0, node.y ?? 0, glowRadius, 0, 2 * Math.PI)
        ctx.fillStyle = gradient
        ctx.globalAlpha = 1
        ctx.fill()
      }

      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(tf.x, tf.y)
      ctx.scale(tf.k, tf.k)

      // 1. Shared hue field, scaled by listening weight.
      for (const n of [...artistSimNodes].sort((a, b) => a.r - b.r)) {
        drawNodeHue(n, 3.85, 1.04, 0.86)
      }
      for (const n of [...subgenreSimNodes].sort((a, b) => a.r - b.r)) {
        drawNodeHue(n, 3.5, 1.12, 0.78)
      }
      for (const n of [...parentSimNodes].sort((a, b) => a.r - b.r)) {
        drawNodeHue(n, 4.3, 1.18, 0.92)
      }

      // 2. Parent-subgenre links
      for (const l of parentSubgenreLinks) {
        const s = l.source as SimNode
        const t = l.target as SimNode
        ctx.beginPath()
        ctx.moveTo(s.x ?? 0, s.y ?? 0)
        ctx.lineTo(t.x ?? 0, t.y ?? 0)
        ctx.strokeStyle = withAlpha(familyColor(s.nodeType === 'parent' ? s.family : t.family), parentSubgenreColorAlpha(s, t))
        ctx.lineWidth   = hoveredNode?.nodeType === 'artist' && hoveredNode.genres?.includes(t.id) && s.family === hoveredNode.family ? 1.6 : 1
        ctx.globalAlpha = parentSubgenreAlpha(s, t)
        ctx.stroke()
      }

      // 3. Genre-artist links
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth   = 0.7
      for (const l of genreArtistLinks) {
        const s = l.source as SimNode
        const t = l.target as SimNode
        if (!s?.x || !t?.x) continue
        ctx.beginPath()
        ctx.moveTo(s.x, s.y ?? 0)
        ctx.lineTo(t.x, t.y ?? 0)
        ctx.globalAlpha = genreArtistAlpha(s, t)
        ctx.stroke()
      }

      // 4. Subgenre nodes
      for (const n of [...subgenreSimNodes].sort((a, b) => a.r - b.r)) {
        const d = dim(n.id)
        const color = familyColor(n.family)
        const signalOpacity = getSubgenreOpacity(n.signal)
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r, 0, 2 * Math.PI)
        ctx.fillStyle   = color
        ctx.globalAlpha = d * Math.min(1, signalOpacity + 0.12)
        ctx.fill()
        ctx.strokeStyle = withAlpha(color, 0.76 + (n.signal ?? 0) * 0.18)
        ctx.lineWidth   = 1.8 + (n.signal ?? 0) * 1.35
        ctx.stroke()
      }

      // 5. Parent nodes
      for (const n of [...parentSimNodes].sort((a, b) => a.r - b.r)) {
        const d = dim(n.id)
        const color = familyColor(n.family)
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r, 0, 2 * Math.PI)
        ctx.fillStyle   = color
        ctx.globalAlpha = d
        ctx.fill()
        ctx.strokeStyle = withAlpha(color, 0.94)
        ctx.lineWidth   = 3 + (n.signal ?? 0) * 1.35
        ctx.stroke()
      }

      // 6. Artist nodes (glow + core)
      for (const n of [...artistSimNodes].sort((a, b) => a.r - b.r)) {
        const d     = dim(n.id)
        const color = familyColor(n.family)
        const signal = n.signal ?? 0
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r * 1.25, 0, 2 * Math.PI)
        ctx.fillStyle   = color
        ctx.globalAlpha = (0.042 + signal * 0.08) * d
        ctx.fill()
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r, 0, 2 * Math.PI)
        ctx.fillStyle   = color
        ctx.globalAlpha = (0.84 + signal * 0.14) * d
        ctx.fill()
        if (signal > 0.1) {
          ctx.strokeStyle = withAlpha(color, 0.5 + signal * 0.35)
          ctx.lineWidth = 0.95 + signal * 1.2
          ctx.stroke()
        }
      }

      // 7. Labels
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      for (const n of parentSimNodes) {
        drawNodeLabel(
          n.label,
          n.x ?? 0,
          n.y ?? 0,
          n.r * 1.45,
          Math.min(15, Math.max(10, n.r * 0.32)),
          dim(n.id) * 0.94,
        )
      }
      for (const n of subgenreSimNodes) {
        const labelOp = Math.max(0.66, getGenreLabelOpacity(n.weight ?? 0, maxSubgenreMs)) * (n.r <= 12 ? 0.72 : 1)
        if (n.r >= 8.5) {
          drawNodeLabel(
            n.label,
            n.x ?? 0,
            n.y ?? 0,
            n.r * 1.75,
            Math.min(12, Math.max(8, n.r * 0.42)),
            labelOp * dim(n.id),
          )
        } else {
          drawNodeLabel(
            n.label,
            n.x ?? 0,
            (n.y ?? 0) + n.r + 9,
            48,
            7,
            labelOp * dim(n.id) * 0.86,
          )
        }
      }
      for (const n of artistSimNodes) {
        if ((n.rank ?? Infinity) > 12 || n.r < 8.5 || (n.signal ?? 0) < 0.16) continue
        drawNodeLabel(
          n.label,
          n.x ?? 0,
          (n.y ?? 0) + n.r + 8,
          Math.max(44, n.r * 5),
          Math.min(9, Math.max(7, n.r * 0.58)),
          dim(n.id) * (0.44 + (n.signal ?? 0) * 0.5),
        )
      }

      ctx.globalAlpha = 1
      ctx.restore()
    }
    redrawRef.current = draw

    // ── Zoom (canvas) ─────────────────────────────────────────────────────────
    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.3, 5])
      .on('zoom', (event) => { transformRef.current = event.transform; draw() })
    d3.select(canvas).call(zoom)

    // ── Simulation ────────────────────────────────────────────────────────────
    let tickCount = 0
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .alphaDecay(0.03)
      .velocityDecay(0.4)
      .force('radial', d3.forceRadial<SimNode>(
        (d) => d.ringTarget ?? (d.nodeType === 'parent' ? parentRing.target : d.nodeType === 'subgenre' ? subgenreRing.target : artistRing.target),
        cx, cy,
      ).strength((d) => d.nodeType === 'parent' ? 0.48 : d.nodeType === 'subgenre' ? 0.34 : 0.014))
      .force('angular', createAngularForce(cx, cy, nodeAngles))
      .force('link', d3.forceLink<SimNode, SimLink>(allSimLinks)
        .id((d) => d.id)
        .distance((l) => l.type === 'parent-subgenre' ? subgenreRing.target - parentRing.target : l.type === 'genre-artist' ? artistRing.target - subgenreRing.target : 86)
        .strength((l) => l.type === 'parent-subgenre' ? 0.045 : l.type === 'genre-artist' ? 0.04 : 0.05))
      .force('charge', d3.forceManyBody<SimNode>().strength((d) => d.nodeType === 'parent' ? -260 : d.nodeType === 'subgenre' ? -92 : -12 - (d.signal ?? 0) * 18))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => d.nodeType === 'parent' ? d.r + 18 : d.nodeType === 'subgenre' ? d.r + 12 : d.r + 5 + (d.signal ?? 0) * 5).strength(0.96))
      .force('soft-bounds', createSoftBoundaryForce(cx, cy, artistRing.outer, 0.12))
      .on('tick', () => {
        // Radius-aware lanes keep the three semantic levels separate without freezing angles.
        for (const n of parentSimNodes) {
          clampToRing(n, cx, cy, n.ringInner ?? parentRing.inner, n.ringOuter ?? parentRing.outer)
        }
        for (const n of subgenreSimNodes) {
          clampToRing(n, cx, cy, n.ringInner ?? subgenreRing.inner, n.ringOuter ?? subgenreRing.outer)
        }
        for (const n of artistSimNodes) {
          clampToRing(n, cx, cy, n.ringInner ?? artistRing.inner, n.ringOuter ?? artistRing.outer)
        }
        if (++tickCount % 2 === 0) draw()
      })
      .on('end', () => { draw() })

    // ── Mouse hit detection ───────────────────────────────────────────────────
    function getNodeAt(mx: number, my: number): SimNode | null {
      const { x, y, k } = transformRef.current
      const sx = (mx - x) / k
      const sy = (my - y) / k
      for (const n of [...parentSimNodes, ...subgenreSimNodes, ...artistSimNodes]) {
        const dx = (n.x ?? 0) - sx
        const dy = (n.y ?? 0) - sy
        if (Math.sqrt(dx * dx + dy * dy) <= Math.max(n.r, 6)) return n
      }
      return null
    }

    function buildRelevantIds(d: SimNode): Set<string> {
      const neighbors = connected.get(d.id) ?? new Set<string>()
      const relevant  = new Set([d.id, ...Array.from(neighbors)])
      if (d.nodeType === 'parent') {
        ;(parentSubgenreMap.get(d.id) ?? []).forEach((sg) => {
          relevant.add(sg)
        })
        ;(artistsByFamily.get(d.family ?? 'other') ?? []).forEach((artist) => {
          relevant.add(artist)
        })
      } else if (d.nodeType === 'artist') {
        const parentId = parentByFamily.get(d.family ?? 'other')
        if (parentId) relevant.add(parentId)
        ;(d.genres ?? []).forEach((genre) => {
          relevant.add(genre)
        })
      }
      return relevant
    }

    function showTooltip(event: MouseEvent, d: SimNode) {
      if (d.nodeType === 'parent') {
        const subgenres    = parentSubgenreMap.get(d.id) ?? []
        const totalArtists = new Set(subgenres.flatMap((sg) => genreArtistsMap.get(sg) ?? []))
        tooltip.innerHTML  = `
          <p style="color:${familyColor(d.family)};font-weight:600;margin-bottom:4px">${d.label}</p>
          <p style="color:#a3a3a3;font-size:11px;margin-bottom:4px">${formatListeningTime(d.weight)} listened</p>
          <p style="color:#666;font-size:11px;margin-bottom:6px">${subgenres.length} subgenre${subgenres.length !== 1 ? 's' : ''} · ${totalArtists.size} artist${totalArtists.size !== 1 ? 's' : ''}</p>
          ${subgenres.length ? `<p style="color:#9ca3af;font-size:11px;line-height:1.8">${subgenres.slice(0, 8).join(', ')}${subgenres.length > 8 ? '…' : ''}</p>` : ''}
        `
      } else if (d.nodeType === 'subgenre') {
        const artists     = genreArtistsMap.get(d.id) ?? []
        tooltip.innerHTML = `
          <p style="color:${familyColor(d.family)};font-weight:600;margin-bottom:4px">${d.label}</p>
          <p style="color:#a3a3a3;font-size:11px;margin-bottom:4px">${formatListeningTime(d.weight)} listened</p>
          <p style="color:#666;font-size:11px;margin-bottom:8px">${artists.length} artist${artists.length !== 1 ? 's' : ''}</p>
          ${artists.length ? `<p style="color:#9ca3af;font-size:11px;margin-bottom:4px">Artists:</p>${artists.slice(0, 6).map((a) => `<p style="color:#e5e7eb;font-size:11px;line-height:1.7">${a}</p>`).join('')}${artists.length > 6 ? `<p style="color:#666;font-size:10px;margin-top:2px">+${artists.length - 6} more</p>` : ''}` : ''}
        `
      } else {
        tooltip.innerHTML = `
          <p style="color:#f5f5f5;font-weight:600;margin-bottom:4px">${d.label}</p>
          <p style="color:#a3a3a3;font-size:11px;margin-bottom:4px">${formatListeningTime(d.weight)} listened${d.play_count ? ` · ${d.play_count} play${d.play_count !== 1 ? 's' : ''}` : ''}${d.rank ? ` · #${d.rank} artist` : ''}</p>
          ${d.genres?.length ? `<p style="color:#666;font-size:11px">${d.genres.slice(0, 5).join(', ')}</p>` : ''}
        `
      }
      tooltip.style.display = 'block'
      const rect = containerRef.current!.getBoundingClientRect()
      tooltip.style.left = `${event.clientX - rect.left + 14}px`
      tooltip.style.top  = `${event.clientY - rect.top  - 10}px`
    }

    let lastHovered: SimNode | null = null

    function onMouseMove(event: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      const node = getNodeAt(event.clientX - rect.left, event.clientY - rect.top)

      if (node !== lastHovered) {
        lastHovered = node
        if (!pinnedNodeRef.current) {
          hoveredNodeRef.current = node
          relevantIdsRef.current = node ? buildRelevantIds(node) : null
        }
        canvas.style.cursor = node ? 'pointer' : 'default'
        if (!node) tooltip.style.display = 'none'
        draw()
      }
      if (node) showTooltip(event, node)
    }

    function onMouseLeave() {
      if (!lastHovered) return
      lastHovered = null
      if (!pinnedNodeRef.current) {
        hoveredNodeRef.current = null
        relevantIdsRef.current = null
      }
      canvas.style.cursor    = 'default'
      tooltip.style.display  = 'none'
      draw()
    }

    function onClick(event: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      const node = getNodeAt(event.clientX - rect.left, event.clientY - rect.top)
      pinnedNodeRef.current = node
      hoveredNodeRef.current = node
      relevantIdsRef.current = node ? buildRelevantIds(node) : null
      setSelectedNode(node)
      if (!node) tooltip.style.display = 'none'
      draw()
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('click', onClick)

    return () => {
      simulation.stop()
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('click', onClick)
    }
  }, [graphData, dims])

  function closeDetailPanel() {
    pinnedNodeRef.current = null
    hoveredNodeRef.current = null
    relevantIdsRef.current = null
    setSelectedNode(null)
    redrawRef.current?.()
  }

  const maxYearMs = Math.max(...(detailData?.yearBars.map((bar) => bar.ms) ?? [1]), 1)

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: '100%', minHeight: 640 }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', borderRadius: 12, background: '#080808' }}
      />
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute', display: 'none',
          background: '#111111', border: '1px solid #1f1f1f',
          borderRadius: 8, padding: '10px 14px', maxWidth: 240,
          pointerEvents: 'none', fontFamily: 'var(--font-dm-sans)', fontSize: 13, zIndex: 10,
        }}
      />
      {selectedNode && detailData && (
        <aside className="absolute right-4 top-4 bottom-4 z-20 w-[360px] max-w-[calc(100%-32px)] overflow-y-auto rounded-xl border border-[#242424] bg-[#101010]/95 p-4 shadow-2xl backdrop-blur">
          <button
            type="button"
            onClick={closeDetailPanel}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#1d1d1d] text-[#b5b5b5] transition-colors hover:bg-[#2a2a2a] hover:text-white"
            aria-label="Close detail panel"
          >
            ×
          </button>

          <div className="pr-10">
            <p className="text-xs uppercase tracking-[0.18em] text-[#777]">
              {selectedNode.nodeType === 'parent' ? 'Genre' : selectedNode.nodeType === 'subgenre' ? 'Subgenre' : 'Artist'}
            </p>
            <h2 className="mt-1 font-syne text-2xl font-bold text-white">{selectedNode.label}</h2>
            <p className="mt-1 text-sm text-[#9a9a9a]">{formatListeningTime(detailData.selectedMs)} listened</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#181818] p-3">
              <p className="text-xl font-bold" style={{ color: detailData.color }}>
                {selectedNode.nodeType === 'artist'
                  ? detailData.artistRank ? `#${detailData.artistRank.toLocaleString()}` : '—'
                  : detailData.artistCount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-[#9a9a9a]">
                {selectedNode.nodeType === 'artist' ? 'listening rank' : 'artists'}
              </p>
            </div>
            <div className="rounded-lg bg-[#181818] p-3">
              <p className="text-xl font-bold" style={{ color: detailData.color }}>{detailData.subgenreCount.toLocaleString()}</p>
              <p className="mt-1 text-xs text-[#9a9a9a]">subgenres</p>
            </div>
          </div>

          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Subgenre Mix</h3>
              {detailData.subgenreMixIsEstimated && (
                <span className="text-[10px] uppercase tracking-wider text-[#666]">tag split</span>
              )}
            </div>
            {detailData.subgenreMix.length ? (
              <div className="rounded-lg bg-[#151515] p-3">
                <div className="mb-3 flex h-4 overflow-hidden rounded-full bg-[#242424]">
                  {detailData.subgenreMix.map((item) => (
                    <div
                      key={item.id}
                      title={`${item.label}: ${item.percent}%`}
                      style={{
                        width: `${Math.max(5, item.percent)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {detailData.subgenreMix.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 overflow-hidden">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{
                          width: `${Math.max(10, Math.min(26, 8 + item.percent * 0.28))}px`,
                          height: `${Math.max(10, Math.min(26, 8 + item.percent * 0.28))}px`,
                          backgroundColor: item.color,
                        }}
                      />
                      <span className="truncate text-xs text-[#d4d4d4]">{item.label}</span>
                      <span className="ml-auto text-xs text-[#777]">{item.percent}%</span>
                    </div>
                  ))}
                </div>
                {detailData.subgenreMixIsEstimated && (
                  <p className="mt-3 text-[11px] leading-relaxed text-[#777]">
                    Artist percentages are split across available genre tags. Exact per-artist subgenre percentages need a backend history-by-genre endpoint.
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-lg bg-[#151515] p-3 text-sm text-[#777]">No subgenre tags available for this selection.</p>
            )}
          </section>

          <section className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Listening By Year</h3>
              <span className="text-[10px] uppercase tracking-wider text-[#666]">weighted</span>
            </div>
            {detailData.yearBars.length ? (
              <div className="flex h-28 items-end gap-1 rounded-lg bg-[#151515] p-3">
                {detailData.yearBars.map((bar) => (
                  <div key={bar.year} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div className="flex h-20 w-full items-end rounded-sm bg-[#242424]">
                      <div
                        className="w-full rounded-sm"
                        style={{
                          height: `${Math.max(8, (bar.ms / maxYearMs) * 100)}%`,
                          backgroundColor: detailData.color,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-[#777]">{String(bar.year).slice(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-[#151515] p-3 text-sm text-[#777]">Import streaming history to unlock year-by-year listening.</p>
            )}
          </section>

          <section className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-white">Artist Leaderboard</h3>
            <div className="space-y-2">
              {detailData.topArtists.length ? detailData.topArtists.map((artist, index) => (
                <div key={artist.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#151515] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{index + 1}. {artist.label}</p>
                    <p className="text-xs text-[#777]">{formatListeningTime(artist.weight)}</p>
                  </div>
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-[#262626]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(8, (artist.signal ?? 0) * 100)}%`, backgroundColor: detailData.color }}
                    />
                  </div>
                </div>
              )) : (
                <p className="rounded-lg bg-[#151515] p-3 text-sm text-[#777]">No artist data for this selection yet.</p>
              )}
            </div>
          </section>

          <section className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-white">Top Songs</h3>
            <div className="space-y-2">
              {detailData.topTracks.length ? detailData.topTracks.map((track, index) => (
                <div key={`${track.id}-${index}`} className="flex items-center gap-3 rounded-lg bg-[#151515] px-3 py-2">
                  {track.albumArt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.albumArt} alt="" className="h-9 w-9 rounded object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded bg-[#262626]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{track.name}</p>
                    <p className="truncate text-xs text-[#777]">{track.artist}</p>
                  </div>
                  <p className="text-xs text-[#888]">
                    {track.minutes ? `${track.minutes}m` : track.plays ? `${track.plays} plays` : `#${track.rank}`}
                  </p>
                </div>
              )) : (
                <p className="rounded-lg bg-[#151515] p-3 text-sm text-[#777]">No matching top songs found in all-time history yet.</p>
              )}
            </div>
          </section>
        </aside>
      )}
    </div>
  )
}
