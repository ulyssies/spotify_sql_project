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
    <main className="relative min-h-screen bg-landing flex items-center justify-center overflow-hidden px-6">
      {/* Wordmark */}
      <div className="absolute top-8 left-8">
        <span className="font-syne font-bold text-primary text-sm tracking-tight">
          SpotYourVibe
        </span>
      </div>

      {/* Hero */}
      <div className="relative z-10 max-w-xl text-center">
        <p className="font-mono text-accent text-xs tracking-[0.2em] uppercase mb-8">
          Your music, your data
        </p>

        <h1 className="font-syne font-bold text-[clamp(3rem,8vw,5.5rem)] leading-[1.05] text-primary mb-6">
          Your listening.<br />Visualized.
        </h1>

        <p className="text-muted text-lg leading-relaxed mb-12">
          Connect your Spotify to see your top tracks, genre trends, and real
          recommendations you haven&apos;t heard yet.
        </p>

        <a
          href={`${API_URL}/auth/login`}
          className="inline-flex items-center gap-3 bg-accent hover:bg-accent/90 text-background font-semibold text-sm px-8 py-4 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <SpotifyIcon />
          Connect with Spotify
        </a>

        <p className="mt-6 text-muted text-xs">
          Read-only access · No data stored beyond your session
        </p>
      </div>
    </main>
  )
}

function SpotifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}
