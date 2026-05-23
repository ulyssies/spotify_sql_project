'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  Music2,
  Mic2,
  BarChart2,
  Sparkles,
  Upload,
  Network,
  Clock,
  LogOut,
  Trash2,
} from 'lucide-react'
import { clearToken } from '@/lib/auth'
import { useUser } from '@/hooks/useUser'

const NAV_ITEMS = [
  { href: '/dashboard/history',         label: 'History',         Icon: Clock     },
  { href: '/dashboard/map',             label: 'Music Map',       Icon: Network   },
  { href: '/dashboard/tracks',          label: 'Top Tracks',      Icon: Music2    },
  { href: '/dashboard/artists',         label: 'Top Artists',     Icon: Mic2      },
  { href: '/dashboard/genres',          label: 'Genres',          Icon: BarChart2 },
  { href: '/dashboard/recommendations', label: 'Recommendations', Icon: Sparkles  },
  { href: '/dashboard/import',          label: 'Import Data',     Icon: Upload    },
]

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const range = searchParams.get('range')
  const initials = user?.display_name?.[0]?.toUpperCase() ?? 'S'

  useEffect(() => {
    function closeProfileMenu(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    if (profileOpen) {
      document.addEventListener('mousedown', closeProfileMenu)
    }

    return () => document.removeEventListener('mousedown', closeProfileMenu)
  }, [profileOpen])

  function handleSignOut() {
    clearToken()
    setProfileOpen(false)
    router.push('/')
  }

  async function handleDeleteData() {
    const confirmed = window.confirm(
      'Delete your SpotYourVibe account data, including imported listening history, synced tracks, artists, and stored Spotify refresh token? This cannot be undone.',
    )
    if (!confirmed) return

    try {
      const { api } = await import('@/lib/api')
      await api.deleteMe()
      clearToken()
      setProfileOpen(false)
      router.push('/')
    } catch (error) {
      window.alert((error as Error).message || 'Could not delete your data. Please try again.')
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        minHeight: 84,
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: '#080808',
        borderTop: '1px solid #1f1f1f',
        boxShadow: '0 -18px 45px rgba(0, 0, 0, 0.45)',
      }}
    >
      <div className="flex w-full items-stretch px-1 sm:px-3">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const to = range ? `${href}?range=${range}` : href
          const active = pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={to}
              title={label}
              className={[
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 py-2 transition-colors',
                active ? 'text-white' : 'text-[#666666] hover:text-white',
              ].join(' ')}
            >
              <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
              <span className="max-w-full truncate text-center text-[clamp(10px,1.35vw,13px)] leading-tight">
                {label}
              </span>
            </Link>
          )
        })}

        <div ref={profileRef} className="relative flex min-w-0 flex-1">
          <button
            type="button"
            title="Profile"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
            className={[
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 py-2 transition-colors',
              profileOpen ? 'text-white' : 'text-[#666666] hover:text-white',
            ].join(' ')}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.display_name ?? 'Profile'}
                className="h-6 w-6 rounded-full object-cover ring-1 ring-white/20 sm:h-7 sm:w-7"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f1f1f] text-[10px] font-medium text-white ring-1 ring-white/10 sm:h-7 sm:w-7">
                {initials}
              </span>
            )}
            <span className="max-w-full truncate text-center text-[clamp(10px,1.35vw,13px)] leading-tight">
              Profile
            </span>
          </button>

          {profileOpen && (
            <div
              className="absolute right-1 z-50 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#101010] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
              style={{ bottom: 'calc(100% + 12px)' }}
            >
              <div className="mb-1 flex items-center gap-2 border-b border-white/10 px-2 pb-2">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.display_name ?? 'Profile'}
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-white/20"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f1f1f] text-xs font-medium text-white ring-1 ring-white/10">
                    {initials}
                  </span>
                )}
                <span className="min-w-0 truncate text-sm text-white">
                  {user?.display_name ?? 'Profile'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#a3a3a3] transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>

              <button
                type="button"
                onClick={handleDeleteData}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-400/[0.08] hover:text-red-200"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                Delete my data
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
