'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { ArtistMapData, TrackNode } from '@/lib/types'

interface Props {
  data: ArtistMapData
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  r: number
  rank: number
  genres: string[]
  color: string
  image_url?: string | null
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  shared_genres: string[]
  n: number
}

const PALETTE = [
  '#f59e0b', '#60a5fa', '#818cf8', '#fbbf24',
  '#ef4444', '#fb923c', '#a78bfa', '#38bdf8',
  '#34d399', '#f472b6', '#4ade80', '#e879f9',
]

function artistColor(rank: number): string {
  return PALETTE[rank % PALETTE.length]
}

function nodeRadius(rank: number): number {
  if (rank <= 3) return 36
  if (rank <= 7) return 26
  return 18
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

export function ArtistWeb({ data }: Props) {
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
    if (!data.artist_nodes.length) return
    const tooltipEl = tooltip

    const { width, height } = dims

    const nodes: SimNode[] = data.artist_nodes.map((a) => ({
      id: a.id,
      label: a.label,
      r: nodeRadius(a.rank ?? 99),
      rank: a.rank ?? 99,
      genres: a.genres ?? [],
      color: artistColor((a.rank ?? 1) - 1),
      image_url: a.image_url,
    }))

    // Spread in a circle so nodes don't all start at (0,0) and repel to infinity.
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI
      const r = Math.min(width, height) * 0.3
      node.x = width / 2 + Math.cos(angle) * r
      node.y = height / 2 + Math.sin(angle) * r
    })

    const links: SimLink[] = data.artist_links.map((l) => ({
      source: l.source,
      target: l.target,
      shared_genres: l.shared_genres,
      n: l.n,
    }))

    const connected = new Map<string, Set<string>>()
    links.forEach((l) => {
      const s = typeof l.source === 'object' ? (l.source as SimNode).id : (l.source as string)
      const t = typeof l.target === 'object' ? (l.target as SimNode).id : (l.target as string)
      if (!connected.has(s)) connected.set(s, new Set())
      if (!connected.has(t)) connected.set(t, new Set())
      connected.get(s)!.add(t)
      connected.get(t)!.add(s)
    })

    const linkCount = new Map<string, number>()
    links.forEach((l) => {
      const s = typeof l.source === 'object' ? (l.source as SimNode).id : (l.source as string)
      const t = typeof l.target === 'object' ? (l.target as SimNode).id : (l.target as string)
      linkCount.set(s, (linkCount.get(s) ?? 0) + 1)
      linkCount.set(t, (linkCount.get(t) ?? 0) + 1)
    })

    const artistTracks = new Map<string, TrackNode[]>()
    data.track_nodes.forEach((t) => {
      if (!artistTracks.has(t.artist_id)) artistTracks.set(t.artist_id, [])
      artistTracks.get(t.artist_id)!.push(t)
    })

    d3.select(svg).selectAll('*').remove()

    const root = d3.select(svg)
      .attr('width', width)
      .attr('height', height)
      .style('background', '#080808')
      .style('border-radius', '12px')

    const g = root.append('g')
    const trackExpansionGroup = g.append('g').attr('class', 'track-expansion')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 6])
      .on('zoom', (event) => g.attr('transform', event.transform))

    root.call(zoom)

    let expandedArtistId: string | null = null

    function collapseAll() {
      trackExpansionGroup.selectAll('*').remove()
      nodeSel.attr('stroke-width', 2)
      expandedArtistId = null
    }

    root.on('click', (event) => {
      if (event.target === svg) { collapseAll(); resetOpacity() }
    })

    const linkSel = g.append('g')
      .selectAll<SVGLineElement, SimLink>('line')
      .data(links)
      .join('line')
      .attr('stroke', '#1DB95470')
      .attr('stroke-dasharray', '5 3')
      .attr('stroke-width', (l) => Math.max(1.5, l.n * 2))

    const nodeSel = g.append('g')
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => d.r)
      .attr('fill', (d) => d.color + '1a')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')

    const labelGroup = g.append('g').style('pointer-events', 'none')

    nodes.forEach((d) => {
      labelGroup.append('text')
        .datum(d)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#aaaaaa')
        .attr('font-size', Math.max(8, d.r * 0.36))
        .attr('font-family', 'var(--font-dm-sans)')
        .attr('font-weight', 600)
        .text(truncate(d.label, d.r > 26 ? 12 : 8))

      labelGroup.append('text')
        .datum(d)
        .attr('text-anchor', 'middle')
        .attr('fill', '#666666')
        .attr('font-size', 8)
        .attr('font-family', 'var(--font-dm-sans)')
        .text(d.rank <= 10 ? `#${d.rank}` : '')
    })

    const simulation = d3.forceSimulation<SimNode>(nodes)
      .alphaDecay(0.015)
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => 160 + (l.n || 1) * 20)
          .strength(0.3),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.2))
      .force('collision', d3.forceCollide<SimNode>().radius((d) => d.r + 12))

    function ticked() {
      const lx1 = (l: SimLink) => (typeof l.source === 'object' ? (l.source as SimNode).x : 0) ?? 0
      const ly1 = (l: SimLink) => (typeof l.source === 'object' ? (l.source as SimNode).y : 0) ?? 0
      const lx2 = (l: SimLink) => (typeof l.target === 'object' ? (l.target as SimNode).x : 0) ?? 0
      const ly2 = (l: SimLink) => (typeof l.target === 'object' ? (l.target as SimNode).y : 0) ?? 0

      linkSel.attr('x1', lx1).attr('y1', ly1).attr('x2', lx2).attr('y2', ly2)
      nodeSel.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0)

      labelGroup.selectAll<SVGTextElement, SimNode>('text').each(function (d) {
        const el = d3.select(this)
        const text = el.text()
        if (text.startsWith('#')) {
          el.attr('x', d.x ?? 0).attr('y', (d.y ?? 0) + d.r + 10)
        } else {
          el.attr('x', d.x ?? 0).attr('y', d.y ?? 0)
        }
      })
    }

    simulation.on('tick', ticked)

    // When no genre links exist, draw proximity lines so the graph isn't
    // just isolated nodes floating in space.
    simulation.on('end', () => {
      if (links.length === 0) {
        nodes.forEach((a, i) => {
          nodes.slice(i + 1).forEach((b) => {
            if (Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0)) < 200) {
              g.insert('line', ':first-child')
                .attr('x1', a.x ?? 0).attr('y1', a.y ?? 0)
                .attr('x2', b.x ?? 0).attr('y2', b.y ?? 0)
                .attr('stroke', '#ffffff08')
                .attr('stroke-width', 1)
                .attr('class', 'proximity-link')
            }
          })
        })
      }
    })

    const drag = d3.drag<SVGCircleElement, SimNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null; d.fy = null
      })

    nodeSel.call(drag)

    function resetOpacity() {
      nodeSel.attr('opacity', 1)
      linkSel.attr('opacity', 1)
      tooltipEl.style.display = 'none'
    }

    nodeSel.on('mouseenter', (event: MouseEvent, d: SimNode) => {
      const neighbors = connected.get(d.id) ?? new Set()
      nodeSel.attr('opacity', (n) => n.id === d.id || neighbors.has(n.id) ? 1 : 0.07)
      linkSel.attr('opacity', (l) => {
        const s = typeof l.source === 'object' ? (l.source as SimNode).id : (l.source as string)
        const t = typeof l.target === 'object' ? (l.target as SimNode).id : (l.target as string)
        return s === d.id || t === d.id ? 1 : 0.07
      })
      const count = linkCount.get(d.id) ?? 0
      tooltipEl.innerHTML = `
        <p style="color:${d.color};font-weight:600;margin-bottom:4px">${d.label}</p>
        ${d.genres.length ? `<p style="color:#666;font-size:11px;margin-bottom:6px">${d.genres.slice(0, 4).join(', ')}</p>` : ''}
        <p style="color:#555;font-size:10px">${count} shared genre link${count !== 1 ? 's' : ''}</p>
      `
      tooltipEl.style.display = 'block'
    })

    nodeSel.on('mousemove', (event: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect()
      tooltipEl.style.left = `${event.clientX - rect.left + 14}px`
      tooltipEl.style.top = `${event.clientY - rect.top - 10}px`
    })

    nodeSel.on('mouseleave', resetOpacity)

    nodeSel.on('click', (event: MouseEvent, d: SimNode) => {
      event.stopPropagation()
      tooltipEl.style.display = 'none'

      if (expandedArtistId === d.id) { collapseAll(); return }

      collapseAll()
      expandedArtistId = d.id

      const tracks = artistTracks.get(d.id) ?? []
      const nodeX = d.x ?? 0
      const nodeY = d.y ?? 0

      nodeSel.filter((n) => n.id === d.id).attr('stroke-width', 4)

      tracks.forEach((track, i) => {
        const angle = (i / tracks.length) * 2 * Math.PI - Math.PI / 2
        const dist = d.r + 78
        const tx = nodeX + Math.cos(angle) * dist
        const ty = nodeY + Math.sin(angle) * dist

        const trackG = trackExpansionGroup.append('g')

        trackG.append('line')
          .attr('x1', nodeX).attr('y1', nodeY)
          .attr('x2', tx).attr('y2', ty)
          .attr('stroke', d.color + '50')
          .attr('stroke-width', 1)

        const labelText = truncate(track.label, 16)
        const boxW = Math.min(labelText.length * 6.5, 100)
        const boxH = 20

        trackG.append('rect')
          .attr('x', tx - boxW / 2).attr('y', ty - boxH / 2)
          .attr('width', boxW).attr('height', boxH)
          .attr('rx', 4)
          .attr('fill', '#141414')
          .attr('stroke', d.color + '70')

        trackG.append('text')
          .attr('x', tx).attr('y', ty)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('fill', '#e5e7eb')
          .attr('font-size', 9)
          .attr('font-family', 'var(--font-dm-sans)')
          .style('pointer-events', 'none')
          .text(labelText)
      })
    })

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
          maxWidth: 220,
          pointerEvents: 'none',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 13,
          zIndex: 10,
        }}
      />
    </div>
  )
}
