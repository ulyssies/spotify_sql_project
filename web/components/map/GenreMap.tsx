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
  type: 'genre' | 'artist'
  r: number
  weight?: number
  track_count?: number
  genres?: string[]
  colorRank?: number
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  type: 'genre-artist' | 'affinity'
  shared?: number
  sameFamily?: boolean
}

function getGenreColor(genre: string): string {
  const g = genre.toLowerCase()

  // Rap / Hip-Hop — catch all variants
  if (g.includes('rap') || g.includes('hip hop') || g.includes('hip-hop') ||
      g.includes('trap') || g.includes('drill') || g.includes('grime') ||
      g.includes('crunk') || g.includes('bounce') || g.includes('dirty south'))
    return '#ef4444'

  // R&B / Soul
  if (g.includes('r&b') || g.includes('soul') || g.includes('funk') ||
      g.includes('gospel') || g.includes('motown') || g.includes('neo soul') ||
      g.includes('quiet storm') || g.includes('contemporary r') ||
      g.includes('urban'))
    return '#f59e0b'

  // Pop
  if (g.includes('pop') || g.includes('boy band') || g.includes('girl group') ||
      g.includes('bubblegum') || g.includes('europop') || g.includes('k-pop') ||
      g.includes('j-pop') || g.includes('c-pop'))
    return '#f472b6'

  // Rock / Metal / Punk
  if (g.includes('rock') || g.includes('metal') || g.includes('punk') ||
      g.includes('grunge') || g.includes('hardcore') || g.includes('emo') ||
      g.includes('screamo') || g.includes('post-hardcore') ||
      g.includes('nu metal') || g.includes('garage'))
    return '#60a5fa'

  // Indie / Alternative
  if (g.includes('indie') || g.includes('alternative') || g.includes('alt ') ||
      g.includes('lo-fi') || g.includes('lo fi') || g.includes('bedroom') ||
      g.includes('college') || g.includes('jangle'))
    return '#818cf8'

  // Electronic / Dance
  if (g.includes('electronic') || g.includes('edm') || g.includes('house') ||
      g.includes('techno') || g.includes('trance') || g.includes('dubstep') ||
      g.includes('drum and bass') || g.includes('dnb') || g.includes('electro') ||
      g.includes('ambient') || g.includes('synthwave') || g.includes('synth') ||
      g.includes('dance') || g.includes('club') || g.includes('rave') ||
      g.includes('bass') || g.includes('beats') || g.includes('chillwave') ||
      g.includes('vaporwave') || g.includes('vapor') || g.includes('wave'))
    return '#22d3ee'

  // Folk / Country
  if (g.includes('folk') || g.includes('country') || g.includes('americana') ||
      g.includes('bluegrass') || g.includes('western') || g.includes('cowboy') ||
      g.includes('outlaw') || g.includes('red dirt') || g.includes('roots'))
    return '#84cc16'

  // Jazz / Blues
  if (g.includes('jazz') || g.includes('blues') || g.includes('swing') ||
      g.includes('bebop') || g.includes('bossa') || g.includes('soul jazz') ||
      g.includes('latin jazz'))
    return '#a78bfa'

  // Classical / Baroque / Orchestral
  if (g.includes('classical') || g.includes('baroque') || g.includes('orchestra') ||
      g.includes('opera') || g.includes('chamber') || g.includes('symphony') ||
      g.includes('choral') || g.includes('choir') || g.includes('piano') ||
      g.includes('string'))
    return '#e879f9'

  // Dream / Shoegaze / Atmospheric
  if (g.includes('dream') || g.includes('shoegaze') || g.includes('slowcore') ||
      g.includes('witch') || g.includes('goth') || g.includes('dark') ||
      g.includes('atmospheric') || g.includes('ethereal') || g.includes('4ad') ||
      g.includes('noise') || g.includes('post rock') || g.includes('post-rock') ||
      g.includes('escape room') || g.includes('permanent wave'))
    return '#2dd4bf'

  // Latin
  if (g.includes('latin') || g.includes('reggaeton') || g.includes('salsa') ||
      g.includes('cumbia') || g.includes('bachata') || g.includes('samba') ||
      g.includes('bossa') || g.includes('flamenco') || g.includes('tropical'))
    return '#fb923c'

  // Reggae
  if (g.includes('reggae') || g.includes('ska') || g.includes('dub') ||
      g.includes('dancehall') || g.includes('afrobeat') || g.includes('afropop'))
    return '#facc15'

  // Default
  return '#6b7280'
}

function getGenreOpacity(weight: number, maxWeight: number): number {
  const ratio = weight / maxWeight
  if (ratio >= 0.7) return 1.0
  if (ratio >= 0.4) return 0.75
  if (ratio >= 0.2) return 0.5
  return 0.3
}

function getGenreStrokeOpacity(weight: number, maxWeight: number): number {
  const ratio = weight / maxWeight
  if (ratio >= 0.7) return 0.9
  if (ratio >= 0.4) return 0.5
  return 0.2
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

function createCircleBoundaryForce(
  cx: number,
  cy: number,
  radius: number,
): d3.Force<SimNode, SimLink> {
  let nodes: SimNode[]

  const force = Object.assign(
    function () {
      nodes.forEach((node) => {
        const dx = (node.x ?? cx) - cx
        const dy = (node.y ?? cy) - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = radius - (node.r || 5) - 8
        if (dist > maxDist && dist > 0) {
          const scale = maxDist / dist
          node.x = cx + dx * scale
          node.y = cy + dy * scale
          const dot = (node.vx ?? 0) * dx + (node.vy ?? 0) * dy
          if (dot > 0) {
            node.vx = (node.vx ?? 0) - (dot / (dist * dist)) * dx * 1.2
            node.vy = (node.vy ?? 0) - (dot / (dist * dist)) * dy * 1.2
          }
        }
      })
    },
    {
      initialize(n: SimNode[]) {
        nodes = n
      },
    },
  )

  return force
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
    if (!data.genre_nodes.length && !data.artist_nodes.length) return
    const tooltipEl = tooltip

    const { width, height } = dims
    const cx = width / 2
    const cy = height / 2
    const boundaryRadius = Math.min(width, height) * 0.62

    const sortedGenres = [...data.genre_nodes].sort((a, b) => b.weight - a.weight)
    const genreRankMap = new Map(sortedGenres.map((g, i) => [g.id, i]))
    const maxWeight = sortedGenres[0]?.weight ?? 1
    const weightByGenreId = new Map(data.genre_nodes.map((g) => [g.id, g.weight]))

    const genreNodes: SimNode[] = data.genre_nodes.map((g) => ({
      id: g.id,
      label: g.label,
      type: 'genre',
      r: 8 + (g.weight / maxWeight) * 22,
      weight: g.weight,
      colorRank: genreRankMap.get(g.id) ?? 999,
    }))

    const artistNodes: SimNode[] = data.artist_nodes.map((a) => ({
      id: a.id,
      label: a.label,
      type: 'artist',
      r: 5,
      track_count: a.track_count,
      genres: a.genres,
    }))

    const nodes: SimNode[] = [...genreNodes, ...artistNodes]

    const innerR = boundaryRadius * 0.65
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI
      const r = node.type === 'genre' ? innerR * 0.5 : innerR * 0.8
      node.x = width / 2 + Math.cos(angle) * r
      node.y = height / 2 + Math.sin(angle) * r
    })

    const affinityLinks: SimLink[] = data.genre_affinity_links.map((l) => ({
      source: l.source,
      target: l.target,
      type: 'affinity',
      shared: l.shared,
      sameFamily: getGenreColor(l.source) === getGenreColor(l.target),
    }))
    const genreArtistLinks: SimLink[] = data.genre_artist_links.map((l) => ({
      source: l.source,
      target: l.target,
      type: 'genre-artist',
    }))
    const allLinks: SimLink[] = [...affinityLinks, ...genreArtistLinks]

    const connected = new Map<string, Set<string>>()
    allLinks.forEach((l) => {
      const s = typeof l.source === 'object' ? (l.source as SimNode).id : (l.source as string)
      const t = typeof l.target === 'object' ? (l.target as SimNode).id : (l.target as string)
      if (!connected.has(s)) connected.set(s, new Set())
      if (!connected.has(t)) connected.set(t, new Set())
      connected.get(s)!.add(t)
      connected.get(t)!.add(s)
    })

    const affinityNeighbors = new Map<string, string[]>()
    data.genre_affinity_links.forEach((l) => {
      if (!affinityNeighbors.has(l.source)) affinityNeighbors.set(l.source, [])
      if (!affinityNeighbors.has(l.target)) affinityNeighbors.set(l.target, [])
      affinityNeighbors.get(l.source)!.push(l.target)
      affinityNeighbors.get(l.target)!.push(l.source)
    })

    const genreArtistsMap = new Map<string, string[]>()
    data.genre_artist_links.forEach((l) => {
      if (!genreArtistsMap.has(l.source)) genreArtistsMap.set(l.source, [])
      genreArtistsMap.get(l.source)!.push(l.target)
    })

    d3.select(svg).selectAll('*').remove()

    const root = d3.select(svg)
      .attr('width', width)
      .attr('height', height)
      .style('background', '#080808')
      .style('border-radius', '12px')

    const g = root.append('g')

    g.append('circle')
      .attr('cx', width / 2)
      .attr('cy', height / 2)
      .attr('r', boundaryRadius)
      .attr('fill', 'none')
      .attr('stroke', '#1f1f1f')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6)
      .style('pointer-events', 'none')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on('zoom', (event) => g.attr('transform', event.transform))

    root.call(zoom)
    root.on('click', (event) => { if (event.target === svg) resetOpacity() })

    const content = g.append('g')

    // Affinity links (bottom z-order).
    const affinityLinkSel = content.append('g')
      .selectAll('line')
      .data(affinityLinks)
      .join('line')
      .attr('stroke', (l) => getGenreColor(l.source as string) + '45')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3 4')

    // Genre-artist links.
    const genreArtistLinkSel = content.append('g')
      .selectAll('line')
      .data(genreArtistLinks)
      .join('line')
      .attr('stroke', '#ffffff30')
      .attr('stroke-width', 1)

    const genreNodeSel = content.append('g')
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(genreNodes)
      .join('circle')
      .attr('r', (d) => d.r)
      .attr('fill', (d) => getGenreColor(d.id))
      .attr('fill-opacity', (d) => getGenreOpacity(d.weight ?? 0, maxWeight))
      .attr('stroke', (d) => getGenreColor(d.id))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', (d) => getGenreStrokeOpacity(d.weight ?? 0, maxWeight))
      .attr('cursor', 'default')
      .style('pointer-events', 'all')

    const artistGroups = content.append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(artistNodes)
      .join('g')
      .each(function (d) {
        const g = d3.select(this)
        const color = getGenreColor(getDominantGenreId(d.genres, weightByGenreId))
        g.append('circle')
          .datum(d)
          .attr('class', 'artist-glow')
          .attr('r', 9)
          .attr('fill', color)
          .attr('opacity', 0.1)
          .style('pointer-events', 'none')
        g.append('circle')
          .datum(d)
          .attr('class', 'artist-core')
          .attr('r', 5)
          .attr('fill', color)
          .attr('opacity', 0.7)
          .attr('cursor', 'default')
          .style('pointer-events', 'all')
      })

    const labelSel = content.append('g').style('pointer-events', 'none')

    nodes.forEach((d) => {
      if (d.type === 'genre') {
        const labelOp = getGenreLabelOpacity(d.weight ?? 0, maxWeight)
        if (d.r > 20) {
          labelSel.append('text')
            .datum(d)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', '#fff')
            .attr('opacity', labelOp)
            .attr('font-size', Math.min(d.r * 0.34, 13))
            .attr('font-family', 'var(--font-dm-sans)')
            .text(d.label)
        } else {
          labelSel.append('text')
            .datum(d)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('opacity', labelOp)
            .attr('font-size', 9)
            .attr('font-family', 'var(--font-dm-sans)')
            .text(d.label)
        }
      }
    })

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .alphaMin(0.001)
      .alphaDecay(0.025)
      .velocityDecay(0.6)
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(allLinks)
          .id((d) => d.id)
          .distance((l) => l.type === 'affinity' ? (l.sameFamily ? 30 : 55) : 60)
          .strength((l) => l.type === 'affinity' ? (l.sameFamily ? 0.9 : 0.4) : 0.4),
      )
      .force(
        'charge',
        d3.forceManyBody<SimNode>().strength((d) => d.type === 'genre' ? -60 : -30),
      )
      .force('center', d3.forceCenter(cx, cy).strength(0.04))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => d.r + 4))
      .force('bounds', null)
      .force('circle-bounds', createCircleBoundaryForce(cx, cy, boundaryRadius))

    simulation.on('end', () => simulation.alphaTarget(0))

    function ticked() {
      const lx1 = (l: SimLink) => (typeof l.source === 'object' ? (l.source as SimNode).x : 0) ?? 0
      const ly1 = (l: SimLink) => (typeof l.source === 'object' ? (l.source as SimNode).y : 0) ?? 0
      const lx2 = (l: SimLink) => (typeof l.target === 'object' ? (l.target as SimNode).x : 0) ?? 0
      const ly2 = (l: SimLink) => (typeof l.target === 'object' ? (l.target as SimNode).y : 0) ?? 0

      affinityLinkSel.attr('x1', lx1).attr('y1', ly1).attr('x2', lx2).attr('y2', ly2)
      genreArtistLinkSel.attr('x1', lx1).attr('y1', ly1).attr('x2', lx2).attr('y2', ly2)
      genreNodeSel.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0)
      artistGroups.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)

      labelSel.selectAll<SVGTextElement, SimNode>('text').each(function (d) {
        const el = d3.select(this)
        if (d.type === 'genre' && d.r <= 20) {
          el.attr('x', d.x ?? 0).attr('y', (d.y ?? 0) + d.r + 12)
        } else {
          el.attr('x', d.x ?? 0).attr('y', d.y ?? 0)
        }
      })
    }

    simulation.on('tick', ticked)

    function resetGenreNodeSurfaceAttrs() {
      genreNodeSel.each(function (d: SimNode) {
        const el = d3.select(this)
        const w = d.weight ?? 0
        el.attr('opacity', 1)
          .attr('fill-opacity', getGenreOpacity(w, maxWeight))
          .attr('stroke-opacity', getGenreStrokeOpacity(w, maxWeight))
      })
      labelSel.selectAll<SVGTextElement, SimNode>('text').each(function (d) {
        if (d?.type !== 'genre') return
        d3.select(this).attr('opacity', getGenreLabelOpacity(d.weight ?? 0, maxWeight))
      })
    }

    function resetOpacity() {
      genreNodeSel.attr('opacity', 1)
      artistGroups.attr('opacity', 1)
      resetGenreNodeSurfaceAttrs()
      affinityLinkSel.attr('opacity', 1).attr('stroke-width', 1.2)
      genreArtistLinkSel.attr('opacity', 1).attr('stroke-width', 1)
      tooltipEl.style.display = 'none'
    }

    function applyNodeHoverOpacity(d: SimNode) {
      const neighbors = connected.get(d.id) ?? new Set()
      const op = (n: SimNode) => (n.id === d.id || neighbors.has(n.id) ? 1 : 0.07)
      genreNodeSel.attr('opacity', (n) => op(n))
      artistGroups.attr('opacity', (n) => op(n))
    }

    function onNodeMouseEnter(event: MouseEvent, d: SimNode) {
      applyNodeHoverOpacity(d)

      if (d.type === 'genre') {
        genreNodeSel
          .filter((n) => n.id === d.id)
          .attr('fill-opacity', 1)
          .attr('stroke-opacity', 1)
        labelSel
          .selectAll<SVGTextElement, SimNode>('text')
          .filter((td) => td?.type === 'genre' && td.id === d.id)
          .attr('opacity', 1)
        affinityLinkSel
          .attr('opacity', (l) => {
            const s = typeof l.source === 'object' ? (l.source as SimNode).id : l.source
            const t = typeof l.target === 'object' ? (l.target as SimNode).id : l.target
            return s === d.id || t === d.id ? 0.7 : 0.02
          })
          .attr('stroke-width', (l) => {
            const s = typeof l.source === 'object' ? (l.source as SimNode).id : l.source
            const t = typeof l.target === 'object' ? (l.target as SimNode).id : l.target
            return s === d.id || t === d.id ? 2.5 : 1.2
          })
        genreArtistLinkSel
          .attr('opacity', (l) => {
            const s = typeof l.source === 'object' ? (l.source as SimNode).id : l.source
            const t = typeof l.target === 'object' ? (l.target as SimNode).id : l.target
            return s === d.id || t === d.id ? 1 : 0.02
          })
          .attr('stroke-width', (l) => {
            const s = typeof l.source === 'object' ? (l.source as SimNode).id : l.source
            const t = typeof l.target === 'object' ? (l.target as SimNode).id : l.target
            return s === d.id || t === d.id ? 2.5 : 1
          })
        const artists = genreArtistsMap.get(d.id) ?? []
        const nearby = affinityNeighbors.get(d.id) ?? []
        tooltipEl.innerHTML = `
          <p style="color:#1DB954;font-weight:600;margin-bottom:4px">${d.label}</p>
          <p style="color:#666;font-size:11px;margin-bottom:8px">${d.weight} top track${d.weight !== 1 ? 's' : ''}</p>
          ${artists.length ? `<p style="color:#9ca3af;font-size:11px;margin-bottom:4px">Artists:</p>${artists.map((a) => `<p style="color:#e5e7eb;font-size:11px;line-height:1.7">${a}</p>`).join('')}` : ''}
          ${nearby.length ? `<p style="color:#666;font-size:10px;margin-top:6px">clusters near: ${nearby.slice(0, 4).join(', ')}${nearby.length > 4 ? '…' : ''}</p>` : ''}
        `
      } else {
        affinityLinkSel.attr('opacity', 0.02).attr('stroke-width', 1.2)
        genreArtistLinkSel
          .attr('opacity', (l) => {
            const s = typeof l.source === 'object' ? (l.source as SimNode).id : l.source
            const t = typeof l.target === 'object' ? (l.target as SimNode).id : l.target
            return s === d.id || t === d.id ? 1 : 0.02
          })
          .attr('stroke-width', (l) => {
            const s = typeof l.source === 'object' ? (l.source as SimNode).id : l.source
            const t = typeof l.target === 'object' ? (l.target as SimNode).id : l.target
            return s === d.id || t === d.id ? 2.5 : 1
          })
        tooltipEl.innerHTML = `
          <p style="color:#f5f5f5;font-weight:600;margin-bottom:4px">${d.label}</p>
          ${d.genres?.length ? `<p style="color:#666;font-size:11px">${d.genres.slice(0, 5).join(', ')}</p>` : ''}
        `
      }

      tooltipEl.style.display = 'block'
    }

    genreNodeSel.on('mouseenter', onNodeMouseEnter)
    artistGroups.selectAll<SVGCircleElement, SimNode>('circle.artist-core').on('mouseenter', onNodeMouseEnter)

    function onNodeMouseMove(event: MouseEvent) {
      const rect = containerRef.current!.getBoundingClientRect()
      tooltipEl.style.left = `${event.clientX - rect.left + 14}px`
      tooltipEl.style.top = `${event.clientY - rect.top - 10}px`
    }

    genreNodeSel.on('mousemove', onNodeMouseMove)
    artistGroups.selectAll<SVGCircleElement, SimNode>('circle.artist-core').on('mousemove', onNodeMouseMove)

    genreNodeSel.on('mouseleave', resetOpacity)
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
