'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard/tracks')
    }
  }, [router])

  return (
    <main className="landing-shell relative h-[100svh] min-h-[620px] overflow-hidden overscroll-none bg-landing px-6 py-8 text-primary">
      <div className="absolute left-6 right-6 top-6 z-20 mx-auto flex max-w-7xl items-center justify-between">
        <span className="font-syne text-sm font-bold text-primary">
          SpotYourVibe
        </span>
        <span className="hidden rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-400 sm:inline-flex">
          Spotify taste intelligence
        </span>
      </div>

      <section className="landing-hero relative z-10 mx-auto grid h-full w-full max-w-7xl items-center pb-20 pt-16">
        <div className="landing-copy text-center sm:text-left">
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.18em] text-accent">
            Music map for Spotify
          </p>

          <h1 className="mb-6 font-syne text-[clamp(3rem,5.4vw,5.65rem)] font-bold leading-[0.96] tracking-normal text-primary">
            Turn listening history into a living taste graph.
          </h1>

          <p className="mb-8 max-w-2xl text-lg leading-relaxed text-zinc-300 sm:text-xl">
            SpotYourVibe connects genres, subgenres, artists, and recommendations
            into a second brain for the music you already love.
          </p>

          <div className="mb-10 flex flex-wrap justify-center gap-2.5 sm:justify-start">
            {['Genre graph', 'Artist ranks', 'Listening history'].map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/10 bg-black/35 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                {label}
              </span>
            ))}
          </div>

          <a
            href={`${API_URL}/auth/login`}
            className="group inline-flex items-center gap-3 rounded-full bg-accent px-8 py-4 text-sm font-semibold text-background shadow-[0_0_36px_rgba(29,185,84,0.35)] transition-all duration-200 hover:bg-[#3be477] hover:shadow-[0_0_52px_rgba(29,185,84,0.48)] active:scale-[0.98]"
          >
            <SpotifyIcon />
            Connect with Spotify
            <span className="h-2 w-2 rounded-full bg-background/70 transition-transform group-hover:translate-x-1" />
          </a>

          <p className="mt-6 text-zinc-500 text-xs">
            Read-only access · Your taste graph starts from your Spotify data
          </p>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <HeroTasteGraph />
        </div>
      </section>

      <FeatureRail />
    </main>
  )
}

const nodes = [
  { id: 'taste', x: 50, y: 50, radius: 7.8, color: '#1DB954', level: 'parent' },
  { id: 'hip-hop', x: 68, y: 30, radius: 4.7, color: '#f94144', level: 'subgenre' },
  { id: 'r-and-b', x: 78, y: 55, radius: 4.1, color: '#f59e0b', level: 'subgenre' },
  { id: 'indie', x: 55, y: 76, radius: 3.8, color: '#818cf8', level: 'subgenre' },
  { id: 'pop', x: 31, y: 60, radius: 4, color: '#ec69b7', level: 'subgenre' },
  { id: 'rock', x: 36, y: 33, radius: 3.5, color: '#5ba7ff', level: 'subgenre' },
  { id: 'a1', x: 80, y: 18, radius: 2.05, color: '#f94144', level: 'artist' },
  { id: 'a2', x: 91, y: 43, radius: 1.8, color: '#f59e0b', level: 'artist' },
  { id: 'a3', x: 69, y: 85, radius: 1.85, color: '#818cf8', level: 'artist' },
  { id: 'a4', x: 17, y: 72, radius: 1.7, color: '#ec69b7', level: 'artist' },
  { id: 'a5', x: 22, y: 24, radius: 1.65, color: '#5ba7ff', level: 'artist' },
  { id: 'a6', x: 91, y: 67, radius: 1.45, color: '#f59e0b', level: 'artist' },
  { id: 'a7', x: 40, y: 89, radius: 1.5, color: '#818cf8', level: 'artist' },
]

const links = [
  ['taste', 'hip-hop'],
  ['taste', 'r-and-b'],
  ['taste', 'indie'],
  ['taste', 'pop'],
  ['taste', 'rock'],
  ['hip-hop', 'a1'],
  ['r-and-b', 'a2'],
  ['r-and-b', 'a6'],
  ['indie', 'a3'],
  ['indie', 'a7'],
  ['pop', 'a4'],
  ['rock', 'a5'],
]

const nodeById = new Map(nodes.map((node) => [node.id, node]))
const graphLinks = [
  ...links.map(([sourceId, targetId]) => {
    const source = nodeById.get(sourceId)!
    const target = nodeById.get(targetId)!
    return { source, target, pulse: true }
  }),
]

function HeroTasteGraph() {
  return (
    <div className="hero-graph" aria-hidden="true">
      <svg className="taste-graph" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="heroGraphGlow" cx="58%" cy="52%" r="48%">
            <stop offset="0%" stopColor="rgba(29,185,84,0.07)" />
            <stop offset="58%" stopColor="rgba(29,185,84,0.024)" />
            <stop offset="100%" stopColor="rgba(29,185,84,0)" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill="url(#heroGraphGlow)" />
        {graphLinks.map(({ source, target }, index) => {
          const pathId = `taste-path-${index}`
          return (
            <g key={pathId}>
              <path
                id={pathId}
                className="taste-link"
                d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
              />
              {index % 2 === 0 && (
                <circle className="taste-signal" r={index % 4 === 0 ? 0.52 : 0.34}>
                  <animateMotion
                    dur={`${4.5 + (index % 6) * 0.55}s`}
                    begin={`${(index % 9) * -0.42}s`}
                    repeatCount="indefinite"
                  >
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              )}
            </g>
          )
        })}
        {nodes.map((node) => (
          <g key={node.id} className={`taste-node-group is-${node.level}`}>
            <circle
              className="taste-halo"
              cx={node.x}
              cy={node.y}
              r={node.radius * (node.level === 'parent' ? 4.2 : node.level === 'subgenre' ? 3.2 : 2.7)}
              fill={node.color}
            />
            <circle
              cx={node.x}
              cy={node.y}
              r={node.radius}
              fill={node.color}
              className="taste-node"
            />
          </g>
        ))}
      </svg>
    </div>
  )
}

const featureItems = [
  { label: 'Map genres, subgenres, and artists as connected nodes', stat: 'Music Map' },
  { label: 'Rank artists by actual listening time', stat: 'Leaderboards' },
  { label: 'See top songs with Spotify artwork', stat: 'Track Memory' },
  { label: 'Explore all-time history by year', stat: 'Timeline' },
  { label: 'Turn Spotify data into a second-brain graph', stat: 'Taste Graph' },
]

function FeatureRail() {
  return (
    <div className="feature-rail" aria-label="Key SpotYourVibe features">
      <div className="feature-track">
        {[...featureItems, ...featureItems].map((item, index) => (
          <div className="feature-pill" key={`${item.stat}-${index}`}>
            <span>{item.stat}</span>
            <p>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpotifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}
