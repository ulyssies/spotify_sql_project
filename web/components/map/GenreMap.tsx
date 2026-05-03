'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { GenreMapData } from '@/lib/types'

interface Props {
  data: GenreMapData
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  nodeType: 'parent' | 'subgenre' | 'artist'
  r: number
  weight?: number
  family?: string
  track_count?: number
  genres?: string[]
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  type: 'parent-subgenre' | 'genre-artist' | 'affinity'
  shared?: number
  sameFamily?: boolean
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

// Hue values used to sort families into a rainbow distribution around the circle
const FAMILY_HUE: Record<string, number> = {
  'hip-hop': 0, 'latin': 24, 'r-and-b': 38, 'reggae': 48,
  'folk': 79, 'dream': 172, 'electronic': 189, 'rock': 213,
  'indie': 234, 'jazz': 259, 'classical': 291, 'pop': 325,
}

function familyColor(family: string | undefined): string {
  return FAMILY_COLORS[family ?? ''] ?? '#6b7280'
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

// Pulls each node toward its assigned angle around (cx, cy) using a tangential velocity nudge
function createAngularForce(
  cx: number,
  cy: number,
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
        while (diff > Math.PI) diff -= 2 * Math.PI
        while (diff < -Math.PI) diff += 2 * Math.PI
        // Tangential unit vector: (-dy, dx) / r — multiply by arc-length error for scale-invariant force
        node.vx = (node.vx ?? 0) + (-dy) * diff * target.strength * alpha
        node.vy = (node.vy ?? 0) + dx * diff * target.strength * alpha
      }
    },
    { initialize(n: SimNode[]) { nodes = n } },
  )
}

// Soft spring: nodes can drift past the boundary ring and remain fully visible
function createSoftBoundaryForce(
  cx: number,
  cy: number,
  radius: number,
  strength: number = 0.12,
): d3.Force<SimNode, SimLink> {
  let nodes: SimNode[]
  return Object.assign(
    function () {
      for (const node of nodes) {
        const dx = (node.x ?? cx) - cx
        const dy = (node.y ?? cy) - cy
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
  const svgRef = useRef<SVGSVGElement>(null)
  const [dims, setDims] = useState({ width: 800, height: 600 })
  const tooltipRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const svg = svgRef.current
    const tooltip = tooltipRef.current
    if (!svg || !tooltip) return
    const parentNodes = data.parent_nodes ?? []
    if (!data.genre_nodes.length && !data.artist_nodes.length) return
    const tooltipEl = tooltip

    const { width, height } = dims
    const cx = width / 2
    const cy = height / 2
    const boundaryRadius = Math.min(width, height) * 0.52   // generous — minimises clumping

    const parentR   = boundaryRadius * 0.17   // inner ring
    const subgenreR = boundaryRadius * 0.53   // middle ring
    const artistR   = boundaryRadius * 0.84   // outer ring

    // ── Weight maps ──────────────────────────────────────────────────────────
    const weightByGenreId = new Map(data.genre_nodes.map((g) => [g.id, g.weight]))
    const genreFamilyMap  = new Map(data.genre_nodes.map((g) => [g.id, g.family]))
    const sortedGenres    = [...data.genre_nodes].sort((a, b) => b.weight - a.weight)
    const maxSubgenreWeight = sortedGenres[0]?.weight ?? 1
    const maxFamilyWeight   = Math.max(...parentNodes.map((p) => p.weight), 1)

    // ── Build SimNodes ───────────────────────────────────────────────────────
    const parentSimNodes: SimNode[] = parentNodes.map((p) => ({
      id: p.id, label: p.label, nodeType: 'parent',
      r: 24 + (p.weight / maxFamilyWeight) * 14,   // 24–38 — always larger than any subgenre
      weight: p.weight, family: p.family,
    }))

    const subgenreSimNodes: SimNode[] = data.genre_nodes.map((g) => ({
      id: g.id, label: g.label, nodeType: 'subgenre',
      r: 6 + (g.weight / maxSubgenreWeight) * 16,  // 6–22
      weight: g.weight, family: g.family,
    }))

    const artistSimNodes: SimNode[] = data.artist_nodes.map((a) => ({
      id: a.id, label: a.label, nodeType: 'artist',
      r: 5, track_count: a.track_count, genres: a.genres,
      family: genreFamilyMap.get(getDominantGenreId(a.genres, weightByGenreId)) ?? 'other',
    }))

    const nodes: SimNode[] = [...parentSimNodes, ...subgenreSimNodes, ...artistSimNodes]

    // ── Family sector assignment — rainbow-sorted so adjacent hues sit next to each other ──
    const presentFamilies = Array.from(new Set(parentSimNodes.map((p) => p.family ?? 'other')))
    presentFamilies.sort((a, b) => (FAMILY_HUE[a] ?? 350) - (FAMILY_HUE[b] ?? 350))
    const numFamilies = Math.max(presentFamilies.length, 1)
    const sectorWidth = (2 * Math.PI) / numFamilies
    const familyCenterAngles = new Map(
      presentFamilies.map((fam, i) => [fam, -Math.PI / 2 + i * sectorWidth]),
    )

    // ── Node angular targets ─────────────────────────────────────────────────
    const nodeAngles = new Map<string, { angle: number; strength: number }>()

    parentSimNodes.forEach((p) =>
      nodeAngles.set(p.id, {
        angle:    familyCenterAngles.get(p.family ?? 'other') ?? 0,
        strength: 0.07,
      }),
    )

    // Group subgenres by family then spread them evenly across the sector
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
      ;[...sgs]
        .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
        .forEach((sg, j) => {
          const angle = n <= 1 ? centerAngle : centerAngle - spread / 2 + (j / (n - 1)) * spread
          nodeAngles.set(sg.id, { angle, strength: 0.04 })
        })
    })

    // ── Initial positions near radial targets ────────────────────────────────
    nodes.forEach((node) => {
      const target  = nodeAngles.get(node.id)
      const targetR = node.nodeType === 'parent' ? parentR
                    : node.nodeType === 'subgenre' ? subgenreR
                    : artistR
      let angle: number
      if (target) {
        angle = target.angle + (Math.random() - 0.5) * 0.5
      } else {
        // Artist: start near dominant subgenre's angular sector
        const dom = getDominantGenreId(node.genres, weightByGenreId)
        angle = nodeAngles.get(dom)?.angle ?? Math.random() * 2 * Math.PI
        angle += (Math.random() - 0.5) * sectorWidth * 0.5
      }
      const r = targetR * (0.85 + Math.random() * 0.3)
      node.x  = cx + Math.cos(angle) * r
      node.y  = cy + Math.sin(angle) * r
    })

    // ── Links ────────────────────────────────────────────────────────────────
    const parentSubgenreLinks: SimLink[] = (data.parent_genre_links ?? []).map((l) => ({
      source: l.source, target: l.target, type: 'parent-subgenre',
    }))

    const genreArtistLinks: SimLink[] = data.genre_artist_links.map((l) => ({
      source: l.source, target: l.target, type: 'genre-artist',
    }))

    // Same-family affinity links used only in simulation to reinforce sector clustering
    const clusterLinks: SimLink[] = data.genre_affinity_links
      .filter((l) => {
        const fa = genreFamilyMap.get(l.source)
        const fb = genreFamilyMap.get(l.target)
        return fa && fb && fa === fb
      })
      .map((l) => ({ source: l.source, target: l.target, type: 'affinity' as const, shared: l.shared, sameFamily: true }))

    const allSimLinks: SimLink[] = [...parentSubgenreLinks, ...genreArtistLinks, ...clusterLinks]

    // ── Neighbour maps for hover ─────────────────────────────────────────────
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

    // ── SVG setup ────────────────────────────────────────────────────────────
    d3.select(svg).selectAll('*').remove()

    const root = d3.select(svg)
      .attr('width', width)
      .attr('height', height)
      .style('background', '#080808')
      .style('border-radius', '12px')

    const g = root.append('g')

    g.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', boundaryRadius)
      .attr('fill', 'none')
      .attr('stroke', '#111111')
      .attr('stroke-width', 1)
      .attr('opacity', 0.18)
      .style('pointer-events', 'none')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on('zoom', (event) => g.attr('transform', event.transform))
    root.call(zoom)
    root.on('click', (event) => { if (event.target === svg) resetOpacity() })

    const content = g.append('g')

    // Z-order (bottom → top): parent glows → links → subgenre nodes → parent nodes → artists → labels

    const parentGlowSel = content.append('g').style('pointer-events', 'none')
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(parentSimNodes)
      .join('circle')
      .attr('r', (d) => d.r * 2.6)
      .attr('fill', (d) => familyColor(d.family))
      .attr('fill-opacity', 0.07)

    const parentSubgenreLinkSel = content.append('g')
      .selectAll('line')
      .data(parentSubgenreLinks)
      .join('line')
      .attr('stroke', (l) => {
        const id = typeof l.source === 'object' ? (l.source as SimNode).id : (l.source as string)
        return familyColor(parentSimNodes.find((n) => n.id === id)?.family) + '35'
      })
      .attr('stroke-width', 1)

    const genreArtistLinkSel = content.append('g')
      .selectAll('line')
      .data(genreArtistLinks)
      .join('line')
      .attr('stroke', '#ffffff15')
      .attr('stroke-width', 0.7)

    const subgenreNodeSel = content.append('g')
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(subgenreSimNodes)
      .join('circle')
      .attr('r', (d) => d.r)
      .attr('fill', (d) => familyColor(d.family))
      .attr('fill-opacity', (d) => getGenreOpacity(d.weight ?? 0, maxSubgenreWeight))
      .attr('stroke', (d) => familyColor(d.family))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', (d) => getGenreStrokeOpacity(d.weight ?? 0, maxSubgenreWeight))
      .attr('cursor', 'default')
      .style('pointer-events', 'all')

    const parentNodeSel = content.append('g')
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(parentSimNodes)
      .join('circle')
      .attr('r', (d) => d.r)
      .attr('fill', (d) => familyColor(d.family))
      .attr('fill-opacity', 0.18)
      .attr('stroke', (d) => familyColor(d.family))
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0.85)
      .attr('cursor', 'default')
      .style('pointer-events', 'all')

    const artistGroups = content.append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(artistSimNodes)
      .join('g')
      .each(function (d) {
        const grp   = d3.select(this)
        const color = familyColor(d.family)
        grp.append('circle').datum(d)
          .attr('class', 'artist-glow')
          .attr('r', 9).attr('fill', color).attr('opacity', 0.07)
          .style('pointer-events', 'none')
        grp.append('circle').datum(d)
          .attr('class', 'artist-core')
          .attr('r', 5).attr('fill', color).attr('opacity', 0.65)
          .attr('cursor', 'default').style('pointer-events', 'all')
      })

    const labelSel = content.append('g').style('pointer-events', 'none')

    parentSimNodes.forEach((d) => {
      labelSel.append('text').datum(d)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', familyColor(d.family)).attr('opacity', 0.9)
        .attr('font-size', 11).attr('font-weight', '600')
        .attr('font-family', 'var(--font-dm-sans)')
        .text(d.label)
    })

    subgenreSimNodes.forEach((d) => {
      const op = getGenreLabelOpacity(d.weight ?? 0, maxSubgenreWeight)
      labelSel.append('text').datum(d)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', d.r > 18 ? 'central' : 'auto')
        .attr('fill', '#fff')
        .attr('opacity', d.r > 18 ? op : op * 0.7)
        .attr('font-size', d.r > 18 ? Math.min(d.r * 0.36, 12) : 8)
        .attr('font-family', 'var(--font-dm-sans)')
        .text(d.label)
    })

    // ── Force simulation ─────────────────────────────────────────────────────
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .alphaMin(0.001)
      .alphaDecay(0.018)
      .velocityDecay(0.60)
      .force(
        'radial',
        d3.forceRadial<SimNode>(
          (d) => d.nodeType === 'parent' ? parentR : d.nodeType === 'subgenre' ? subgenreR : artistR,
          cx, cy,
        ).strength((d) => d.nodeType === 'parent' ? 0.22 : d.nodeType === 'subgenre' ? 0.16 : 0.10),
      )
      .force('angular', createAngularForce(cx, cy, nodeAngles))
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(allSimLinks)
          .id((d) => d.id)
          .distance((l) =>
            l.type === 'parent-subgenre' ? subgenreR - parentR
            : l.type === 'genre-artist'  ? artistR - subgenreR
            : 55,
          )
          .strength((l) =>
            l.type === 'parent-subgenre' ? 0.02
            : l.type === 'genre-artist'  ? 0.07
            : 0.18,
          ),
      )
      .force(
        'charge',
        d3.forceManyBody<SimNode>().strength((d) =>
          d.nodeType === 'parent' ? -120 : d.nodeType === 'subgenre' ? -35 : -12,
        ),
      )
      .force('collision', d3.forceCollide<SimNode>().radius((d) => d.r + 5))
      .force('soft-bounds', createSoftBoundaryForce(cx, cy, boundaryRadius, 0.12))

    simulation.on('end', () => simulation.alphaTarget(0))

    function ticked() {
      const x1 = (l: SimLink) => (typeof l.source === 'object' ? (l.source as SimNode).x : 0) ?? 0
      const y1 = (l: SimLink) => (typeof l.source === 'object' ? (l.source as SimNode).y : 0) ?? 0
      const x2 = (l: SimLink) => (typeof l.target === 'object' ? (l.target as SimNode).x : 0) ?? 0
      const y2 = (l: SimLink) => (typeof l.target === 'object' ? (l.target as SimNode).y : 0) ?? 0

      parentSubgenreLinkSel.attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
      genreArtistLinkSel   .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
      parentGlowSel    .attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0)
      subgenreNodeSel  .attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0)
      parentNodeSel    .attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0)
      artistGroups.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)

      labelSel.selectAll<SVGTextElement, SimNode>('text').each(function (d) {
        if (!d) return
        const el = d3.select(this)
        if (d.nodeType === 'parent') {
          el.attr('x', d.x ?? 0).attr('y', d.y ?? 0)
        } else if (d.nodeType === 'subgenre') {
          el.attr('x', d.x ?? 0).attr('y', d.r > 18 ? (d.y ?? 0) : (d.y ?? 0) + d.r + 10)
        }
      })
    }

    simulation.on('tick', ticked)

    // ── Hover interactions ───────────────────────────────────────────────────
    function resetSubgenreNodeAttrs() {
      subgenreNodeSel.each(function (d: SimNode) {
        d3.select(this)
          .attr('fill-opacity', getGenreOpacity(d.weight ?? 0, maxSubgenreWeight))
          .attr('stroke-opacity', getGenreStrokeOpacity(d.weight ?? 0, maxSubgenreWeight))
      })
      labelSel.selectAll<SVGTextElement, SimNode>('text').each(function (d) {
        if (!d || d.nodeType !== 'subgenre') return
        d3.select(this).attr('opacity', getGenreLabelOpacity(d.weight ?? 0, maxSubgenreWeight) * (d.r <= 18 ? 0.7 : 1))
      })
    }

    function resetOpacity() {
      parentGlowSel.attr('fill-opacity', 0.07)
      parentNodeSel.attr('opacity', 1).attr('fill-opacity', 0.18).attr('stroke-opacity', 0.85)
      subgenreNodeSel.attr('opacity', 1)
      resetSubgenreNodeAttrs()
      artistGroups.attr('opacity', 1)
      parentSubgenreLinkSel.attr('opacity', 1).attr('stroke-width', 1)
      genreArtistLinkSel.attr('opacity', 1).attr('stroke-width', 0.7)
      labelSel.selectAll<SVGTextElement, SimNode>('text').each(function (d) {
        if (!d || d.nodeType !== 'parent') return
        d3.select(this).attr('opacity', 0.9)
      })
      tooltipEl.style.display = 'none'
    }

    function applyHoverFocus(d: SimNode) {
      const neighbors = connected.get(d.id) ?? new Set<string>()
      const relevant  = new Set([d.id, ...Array.from(neighbors) as string[]])

      if (d.nodeType === 'parent') {
        ;(parentSubgenreMap.get(d.id) ?? []).forEach((sg) => {
          relevant.add(sg)
          ;(connected.get(sg) ?? new Set()).forEach((x) => relevant.add(x))
        })
      }

      const op = (n: SimNode) => (relevant.has(n.id) ? 1 : 0.05)

      parentGlowSel   .attr('fill-opacity', (n) => relevant.has(n.id) ? 0.14 : 0.02)
      parentNodeSel   .attr('opacity', op)
      subgenreNodeSel .attr('opacity', op)
      artistGroups    .attr('opacity', op)

      parentSubgenreLinkSel.attr('opacity', (l) => {
        const s = typeof l.source === 'object' ? (l.source as SimNode).id : (l.source as string)
        const t = typeof l.target === 'object' ? (l.target as SimNode).id : (l.target as string)
        return relevant.has(s) && relevant.has(t) ? 0.7 : 0.02
      })
      genreArtistLinkSel.attr('opacity', (l) => {
        const s = typeof l.source === 'object' ? (l.source as SimNode).id : (l.source as string)
        const t = typeof l.target === 'object' ? (l.target as SimNode).id : (l.target as string)
        return relevant.has(s) && relevant.has(t) ? 0.85 : 0.02
      })
    }

    function onNodeMouseEnter(event: MouseEvent, d: SimNode) {
      applyHoverFocus(d)

      if (d.nodeType === 'parent') {
        const subgenres    = parentSubgenreMap.get(d.id) ?? []
        const totalArtists = new Set(subgenres.flatMap((sg) => genreArtistsMap.get(sg) ?? []))
        tooltipEl.innerHTML = `
          <p style="color:${familyColor(d.family)};font-weight:600;margin-bottom:4px">${d.label}</p>
          <p style="color:#666;font-size:11px;margin-bottom:6px">${subgenres.length} subgenre${subgenres.length !== 1 ? 's' : ''} · ${totalArtists.size} artist${totalArtists.size !== 1 ? 's' : ''}</p>
          ${subgenres.length ? `<p style="color:#9ca3af;font-size:11px;line-height:1.8">${subgenres.slice(0, 8).join(', ')}${subgenres.length > 8 ? '…' : ''}</p>` : ''}
        `
      } else if (d.nodeType === 'subgenre') {
        const artists = genreArtistsMap.get(d.id) ?? []
        tooltipEl.innerHTML = `
          <p style="color:${familyColor(d.family)};font-weight:600;margin-bottom:4px">${d.label}</p>
          <p style="color:#666;font-size:11px;margin-bottom:8px">${d.weight} artist${d.weight !== 1 ? 's' : ''}</p>
          ${artists.length ? `<p style="color:#9ca3af;font-size:11px;margin-bottom:4px">Artists:</p>${artists.slice(0, 6).map((a) => `<p style="color:#e5e7eb;font-size:11px;line-height:1.7">${a}</p>`).join('')}${artists.length > 6 ? `<p style="color:#666;font-size:10px;margin-top:2px">+${artists.length - 6} more</p>` : ''}` : ''}
        `
      } else {
        tooltipEl.innerHTML = `
          <p style="color:#f5f5f5;font-weight:600;margin-bottom:4px">${d.label}</p>
          ${d.genres?.length ? `<p style="color:#666;font-size:11px">${d.genres.slice(0, 5).join(', ')}</p>` : ''}
        `
      }
      tooltipEl.style.display = 'block'
    }

    parentNodeSel.on('mouseenter', onNodeMouseEnter)
    subgenreNodeSel.on('mouseenter', onNodeMouseEnter)
    artistGroups.selectAll<SVGCircleElement, SimNode>('circle.artist-core').on('mouseenter', onNodeMouseEnter)

    function onNodeMouseMove(event: MouseEvent) {
      const rect = containerRef.current!.getBoundingClientRect()
      tooltipEl.style.left = `${event.clientX - rect.left + 14}px`
      tooltipEl.style.top  = `${event.clientY - rect.top - 10}px`
    }

    parentNodeSel.on('mousemove', onNodeMouseMove)
    subgenreNodeSel.on('mousemove', onNodeMouseMove)
    artistGroups.selectAll<SVGCircleElement, SimNode>('circle.artist-core').on('mousemove', onNodeMouseMove)

    parentNodeSel.on('mouseleave', resetOpacity)
    subgenreNodeSel.on('mouseleave', resetOpacity)
    artistGroups.selectAll<SVGCircleElement, SimNode>('circle.artist-core').on('mouseleave', resetOpacity)

    return () => { simulation.stop() }
  }, [data, dims])

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          display: 'none',
          background: '#111111',
          border: '1px solid #1f1f1f',
          borderRadius: 8,
          padding: '10px 14px',
          maxWidth: 240,
          pointerEvents: 'none',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 13,
          zIndex: 10,
        }}
      />
    </div>
  )
}
