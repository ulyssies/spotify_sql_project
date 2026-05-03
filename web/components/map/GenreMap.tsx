'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import type { GenreMapData } from '@/lib/types'

interface Props { data: GenreMapData }

interface SimNode extends d3.SimulationNodeDatum {
  id: string; label: string; nodeType: 'parent' | 'subgenre' | 'artist'
  r: number; weight?: number; family?: string; play_count?: number; genres?: string[]
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

function getDominantGenreId(genres: string[] | undefined, weightByGenreId: Map<string, number>): string {
  if (!genres?.length) return ''
  return genres.reduce((best, g) =>
    (weightByGenreId.get(g) ?? 0) > (weightByGenreId.get(best) ?? 0) ? g : best,
  genres[0])
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

export function GenreMap({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const tooltipRef   = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 800, height: 600 })
  const transformRef    = useRef(d3.zoomIdentity)
  const relevantIdsRef  = useRef<Set<string> | null>(null)

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
    const parentNodes = data.parent_nodes ?? []
    if (!data.genre_nodes.length && !data.artist_nodes.length) return null

    const parentMsValues   = parentNodes.map((p) => p.total_ms)
    const subgenreMsValues = data.genre_nodes.map((g) => g.total_ms)
    const artistMsValues   = data.artist_nodes.map((a) => a.total_ms ?? 0)
    const maxSubgenreMs    = Math.max(...subgenreMsValues, 1)

    const scaleParent   = d3.scaleSqrt().domain([Math.min(...parentMsValues),   Math.max(...parentMsValues,   1)]).range([28, 55]).clamp(true)
    const scaleSubgenre = d3.scaleSqrt().domain([Math.min(...subgenreMsValues), maxSubgenreMs]).range([12, 26]).clamp(true)
    const scaleArtist   = d3.scaleSqrt().domain([Math.min(...artistMsValues),   Math.max(...artistMsValues,   1)]).range([3,  10]).clamp(true)

    const weightByGenreId = new Map(data.genre_nodes.map((g) => [g.id, g.total_ms]))
    const genreFamilyMap  = new Map(data.genre_nodes.map((g) => [g.id, g.family]))

    const parentSimNodes: SimNode[] = parentNodes.map((p) => ({
      id: p.id, label: p.label, nodeType: 'parent',
      r: scaleParent(p.total_ms), weight: p.total_ms, family: p.family,
    }))

    const subgenreSimNodes: SimNode[] = data.genre_nodes.map((g) => ({
      id: g.id, label: g.label, nodeType: 'subgenre',
      r: scaleSubgenre(g.total_ms), weight: g.total_ms, family: g.family,
    }))

    // Family fallback for orphaned artists whose subgenres were all filtered out —
    // extract the family from the parent_artist_link source ("parent:r-and-b" → "r-and-b")
    const orphanFamilyMap = new Map<string, string>()
    ;(data.parent_artist_links ?? []).forEach((l) => {
      orphanFamilyMap.set(l.target, l.source.replace('parent:', ''))
    })

    const artistSimNodes: SimNode[] = data.artist_nodes.map((a) => {
      const familyCounts = new Map<string, number>()
      for (const g of (a.genres ?? [])) {
        const fam = genreFamilyMap.get(g)
        if (fam) familyCounts.set(fam, (familyCounts.get(fam) ?? 0) + 1)
      }
      const dominantFamily = Array.from(familyCounts.entries()).sort((x, y) => y[1] - x[1])[0]?.[0]
        ?? orphanFamilyMap.get(a.id)
        ?? 'other'
      return {
        id: a.id, label: a.label, nodeType: 'artist' as const,
        r: scaleArtist(a.total_ms ?? 0), play_count: a.play_count, genres: a.genres,
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
      nodeAngles.set(p.id, { angle: familyCenterAngles.get(p.family ?? 'other') ?? 0, strength: 0.07 }),
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
      const spreadFraction = n <= 1 ? 0 : Math.min(0.82, 0.22 + n * 0.04)
      const spread         = sectorWidth * spreadFraction
      ;[...sgs].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).forEach((sg, j) => {
        const angle = n <= 1 ? centerAngle : centerAngle - spread / 2 + (j / (n - 1)) * spread
        nodeAngles.set(sg.id, { angle, strength: 0.04 })
      })
    })

    // Links
    const parentSubgenreLinks: SimLink[] = (data.parent_genre_links ?? []).map((l) => ({ source: l.source, target: l.target, type: 'parent-subgenre' as const }))
    const genreArtistLinks: SimLink[]    = [
      ...data.genre_artist_links.map((l) => ({ source: l.source, target: l.target, type: 'genre-artist' as const })),
      ...(data.parent_artist_links ?? []).map((l) => ({ source: l.source, target: l.target, type: 'genre-artist' as const })),
    ]
    const clusterLinks: SimLink[] = data.genre_affinity_links
      .filter((l) => { const fa = genreFamilyMap.get(l.source); const fb = genreFamilyMap.get(l.target); return fa && fb && fa === fb })
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
    ;(data.parent_genre_links ?? []).forEach((l) => {
      if (!parentSubgenreMap.has(l.source)) parentSubgenreMap.set(l.source, [])
      parentSubgenreMap.get(l.source)!.push(l.target)
    })
    const genreArtistsMap = new Map<string, string[]>()
    data.genre_artist_links.forEach((l) => {
      if (!genreArtistsMap.has(l.source)) genreArtistsMap.set(l.source, [])
      genreArtistsMap.get(l.source)!.push(l.target)
    })

    return {
      parentSimNodes, subgenreSimNodes, artistSimNodes,
      parentSubgenreLinks, genreArtistLinks, allSimLinks,
      connected, parentSubgenreMap, genreArtistsMap,
      nodeAngles, sectorWidth, maxSubgenreMs, weightByGenreId,
    }
  }, [data])

  // ── Canvas rendering effect — reruns on data change or resize ───────────────
  useEffect(() => {
    const canvas  = canvasRef.current!
    const tooltip = tooltipRef.current!
    if (!canvasRef.current || !tooltipRef.current || !graphData) return

    const {
      parentSimNodes, subgenreSimNodes, artistSimNodes,
      parentSubgenreLinks, genreArtistLinks, allSimLinks,
      connected, parentSubgenreMap, genreArtistsMap,
      nodeAngles, sectorWidth, maxSubgenreMs, weightByGenreId,
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

    const cx = width / 2
    const cy = height / 2
    const boundaryRadius = Math.min(width, height) * 0.52
    const parentR   = boundaryRadius * 0.17
    const subgenreR = boundaryRadius * 0.50
    const artistR   = boundaryRadius * 0.90

    const nodes: SimNode[] = [...parentSimNodes, ...subgenreSimNodes, ...artistSimNodes]

    // Reset velocities and set initial positions from radial targets
    nodes.forEach((node) => {
      node.vx = 0; node.vy = 0
      const target  = nodeAngles.get(node.id)
      const targetR = node.nodeType === 'parent' ? parentR : node.nodeType === 'subgenre' ? subgenreR : artistR
      let angle: number
      if (target) {
        angle = target.angle + (Math.random() - 0.5) * 0.5
      } else {
        const dom = getDominantGenreId(node.genres, weightByGenreId)
        angle = nodeAngles.get(dom)?.angle ?? Math.random() * 2 * Math.PI
        angle += (Math.random() - 0.5) * sectorWidth * 0.5
      }
      node.x = cx + Math.cos(angle) * targetR * (0.85 + Math.random() * 0.3)
      node.y = cy + Math.sin(angle) * targetR * (0.85 + Math.random() * 0.3)
    })

    // ── Draw ──────────────────────────────────────────────────────────────────
    function draw() {
      const tf          = transformRef.current
      const relevantIds = relevantIdsRef.current

      const dim = (id: string) => relevantIds === null ? 1 : relevantIds.has(id) ? 1 : 0.05

      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(tf.x, tf.y)
      ctx.scale(tf.k, tf.k)

      // 1. Dashed boundary ring
      ctx.beginPath()
      ctx.arc(cx, cy, boundaryRadius, 0, 2 * Math.PI)
      ctx.strokeStyle = '#2a2a2a'
      ctx.lineWidth   = 1
      ctx.globalAlpha = 0.5
      ctx.setLineDash([4, 6])
      ctx.stroke()
      ctx.setLineDash([])

      // 2. Parent glows
      for (const n of parentSimNodes) {
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r * 2.6, 0, 2 * Math.PI)
        ctx.fillStyle   = familyColor(n.family)
        ctx.globalAlpha = relevantIds === null ? 0.07 : relevantIds.has(n.id) ? 0.14 : 0.02
        ctx.fill()
      }

      // 3. Parent-subgenre links
      for (const l of parentSubgenreLinks) {
        const s = l.source as SimNode
        const t = l.target as SimNode
        ctx.beginPath()
        ctx.moveTo(s.x ?? 0, s.y ?? 0)
        ctx.lineTo(t.x ?? 0, t.y ?? 0)
        ctx.strokeStyle = withAlpha(familyColor(s.nodeType === 'parent' ? s.family : t.family), 0.21)
        ctx.lineWidth   = 1
        ctx.globalAlpha = relevantIds === null ? 1 : (relevantIds.has(s.id) && relevantIds.has(t.id)) ? 0.7 : 0.02
        ctx.stroke()
      }

      // 4. Genre-artist links
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth   = 0.7
      for (const l of genreArtistLinks) {
        const s = l.source as SimNode
        const t = l.target as SimNode
        if (!s?.x || !t?.x) continue
        ctx.beginPath()
        ctx.moveTo(s.x, s.y ?? 0)
        ctx.lineTo(t.x, t.y ?? 0)
        ctx.globalAlpha = relevantIds === null ? 0.08 : (relevantIds.has(s.id) && relevantIds.has(t.id)) ? 0.85 : 0.02
        ctx.stroke()
      }

      // 5. Subgenre nodes
      for (const n of subgenreSimNodes) {
        ctx.globalAlpha = dim(n.id)
        const color = familyColor(n.family)
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r, 0, 2 * Math.PI)
        ctx.fillStyle   = withAlpha(color, getGenreOpacity(n.weight ?? 0, maxSubgenreMs))
        ctx.fill()
        ctx.strokeStyle = withAlpha(color, getGenreStrokeOpacity(n.weight ?? 0, maxSubgenreMs))
        ctx.lineWidth   = 1.5
        ctx.stroke()
      }

      // 6. Parent nodes
      for (const n of parentSimNodes) {
        ctx.globalAlpha = dim(n.id)
        const color = familyColor(n.family)
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r, 0, 2 * Math.PI)
        ctx.fillStyle   = withAlpha(color, 0.18)
        ctx.fill()
        ctx.strokeStyle = withAlpha(color, 0.85)
        ctx.lineWidth   = 2.5
        ctx.stroke()
      }

      // 7. Artist nodes (glow + core)
      for (const n of artistSimNodes) {
        const d     = dim(n.id)
        const color = familyColor(n.family)
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r * 1.8, 0, 2 * Math.PI)
        ctx.fillStyle   = color
        ctx.globalAlpha = 0.07 * d
        ctx.fill()
        ctx.beginPath()
        ctx.arc(n.x ?? 0, n.y ?? 0, n.r, 0, 2 * Math.PI)
        ctx.fillStyle   = color
        ctx.globalAlpha = 0.65 * d
        ctx.fill()
      }

      // 8. Labels
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      for (const n of parentSimNodes) {
        ctx.globalAlpha = dim(n.id) * 0.9
        ctx.fillStyle   = familyColor(n.family)
        ctx.font        = '600 11px sans-serif'
        ctx.fillText(n.label, n.x ?? 0, n.y ?? 0)
      }
      ctx.fillStyle = '#ffffff'
      for (const n of subgenreSimNodes) {
        const labelOp = getGenreLabelOpacity(n.weight ?? 0, maxSubgenreMs) * (n.r <= 18 ? 0.7 : 1)
        ctx.globalAlpha = labelOp * dim(n.id)
        ctx.font        = `${n.r > 18 ? Math.min(n.r * 0.36, 12) : 8}px sans-serif`
        ctx.fillText(n.label, n.x ?? 0, n.r > 18 ? (n.y ?? 0) : (n.y ?? 0) + n.r + 10)
      }

      ctx.globalAlpha = 1
      ctx.restore()
    }

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
        (d) => d.nodeType === 'parent' ? parentR : d.nodeType === 'subgenre' ? subgenreR : artistR,
        cx, cy,
      ).strength((d) => d.nodeType === 'parent' ? 0.22 : d.nodeType === 'subgenre' ? 0.16 : 0.20))
      .force('angular', createAngularForce(cx, cy, nodeAngles))
      .force('link', d3.forceLink<SimNode, SimLink>(allSimLinks)
        .id((d) => d.id)
        .distance((l) => l.type === 'parent-subgenre' ? subgenreR - parentR : l.type === 'genre-artist' ? artistR - subgenreR : 55)
        .strength((l) => l.type === 'parent-subgenre' ? 0.02 : l.type === 'genre-artist' ? 0.07 : 0.18))
      .force('charge', d3.forceManyBody<SimNode>().strength((d) => d.nodeType === 'parent' ? -120 : d.nodeType === 'subgenre' ? -35 : -20))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => d.nodeType === 'artist' ? d.r + 6 : d.r + 8))
      .force('artist-separation', (() => {
        // Repel artists away from parent/subgenre nodes so tiers don't overlap
        const minDist = subgenreR * 0.72
        let allNodes: SimNode[]
        const force = function() {
          const nonArtists = allNodes.filter((n) => n.nodeType !== 'artist')
          for (const a of allNodes) {
            if (a.nodeType !== 'artist') continue
            for (const b of nonArtists) {
              const dx   = (a.x ?? 0) - (b.x ?? 0)
              const dy   = (a.y ?? 0) - (b.y ?? 0)
              const dist = Math.sqrt(dx * dx + dy * dy) || 1
              if (dist < minDist) {
                const push = (minDist - dist) / dist * 0.4
                a.vx = (a.vx ?? 0) + dx * push
                a.vy = (a.vy ?? 0) + dy * push
              }
            }
          }
        }
        force.initialize = (n: SimNode[]) => { allNodes = n }
        return force
      })())
      .force('soft-bounds', createSoftBoundaryForce(cx, cy, boundaryRadius, 0.12))
      .on('tick', () => { if (++tickCount % 2 === 0) draw() })
      .on('end', draw)

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
          ;(connected.get(sg) ?? new Set()).forEach((x) => relevant.add(x))
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
          <p style="color:#666;font-size:11px;margin-bottom:6px">${subgenres.length} subgenre${subgenres.length !== 1 ? 's' : ''} · ${totalArtists.size} artist${totalArtists.size !== 1 ? 's' : ''}</p>
          ${subgenres.length ? `<p style="color:#9ca3af;font-size:11px;line-height:1.8">${subgenres.slice(0, 8).join(', ')}${subgenres.length > 8 ? '…' : ''}</p>` : ''}
        `
      } else if (d.nodeType === 'subgenre') {
        const artists     = genreArtistsMap.get(d.id) ?? []
        tooltip.innerHTML = `
          <p style="color:${familyColor(d.family)};font-weight:600;margin-bottom:4px">${d.label}</p>
          <p style="color:#666;font-size:11px;margin-bottom:8px">${artists.length} artist${artists.length !== 1 ? 's' : ''}</p>
          ${artists.length ? `<p style="color:#9ca3af;font-size:11px;margin-bottom:4px">Artists:</p>${artists.slice(0, 6).map((a) => `<p style="color:#e5e7eb;font-size:11px;line-height:1.7">${a}</p>`).join('')}${artists.length > 6 ? `<p style="color:#666;font-size:10px;margin-top:2px">+${artists.length - 6} more</p>` : ''}` : ''}
        `
      } else {
        tooltip.innerHTML = `
          <p style="color:#f5f5f5;font-weight:600;margin-bottom:4px">${d.label}</p>
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
        relevantIdsRef.current = node ? buildRelevantIds(node) : null
        canvas.style.cursor = node ? 'pointer' : 'default'
        if (!node) tooltip.style.display = 'none'
        draw()
      }
      if (node) showTooltip(event, node)
    }

    function onMouseLeave() {
      if (!lastHovered) return
      lastHovered = null
      relevantIdsRef.current = null
      canvas.style.cursor    = 'default'
      tooltip.style.display  = 'none'
      draw()
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)

    return () => {
      simulation.stop()
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [graphData, dims])

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}
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
    </div>
  )
}
