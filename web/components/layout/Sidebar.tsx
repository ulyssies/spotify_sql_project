'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  Music2,
  Mic2,
  BarChart2,
  Sparkles,
  Upload,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { clearToken } from '@/lib/auth'
import { useUser } from '@/hooks/useUser'

const NAV_ITEMS = [
  { href: '/dashboard/tracks',          label: 'Top Tracks',      Icon: Music2    },
  { href: '/dashboard/artists',         label: 'Top Artists',     Icon: Mic2      },
  { href: '/dashboard/genres',          label: 'Genres',          Icon: BarChart2 },
  { href: '/dashboard/recommendations', label: 'Recommendations', Icon: Sparkles  },
  { href: '/dashboard/import',          label: 'Import Data',     Icon: Upload    },
]

function NavLink({
  href,
  label,
  Icon,
  collapsed,
}: {
  href: string
  label: string
  Icon: React.ElementType
  collapsed: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const range = searchParams.get('range')
  const active = pathname.startsWith(href)
  const to = range ? `${href}?range=${range}` : href

  return (
    <Link
      href={to}
      title={collapsed ? label : undefined}
      className={[
        'flex items-center gap-3 rounded-lg text-sm transition-all duration-150',
        collapsed ? 'px-3 py-2.5 justify-center' : 'px-4 py-2.5',
        active
          ? 'text-white bg-[#1f1f1f] font-medium'
          : 'text-[#666666] hover:text-white hover:bg-[#111111]',
      ].join(' ')}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}

function MobileNav() {
  const pathname = usePathname()
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex"
      style={{ height: 64, backgroundColor: '#080808', borderTop: '1px solid #1f1f1f' }}
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={[
            'flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors',
            pathname.startsWith(href) ? 'text-white' : 'text-[#666666]',
          ].join(' ')}
        >
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}

export function Sidebar() {
  const router = useRouter()
  const { user } = useUser()
  const [collapsed, setCollapsed] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      const stored = localStorage.getItem('sidebar_collapsed')
      if (stored === 'true') setCollapsed(true)
      initialized.current = true
    }
  }, [])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  function handleLogout() {
    clearToken()
    router.push('/')
  }

  const initials = user?.display_name?.[0]?.toUpperCase() ?? 'S'

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <div
        className="hidden md:block relative shrink-0 transition-[width] duration-200 ease-in-out"
        style={{ width: collapsed ? 64 : 240 }}
      >
        <aside className="flex flex-col h-screen bg-surface border-r border-border overflow-hidden w-full">
          {/* Logo */}
          <div className="px-4 py-6 border-b border-border flex items-center justify-center shrink-0">
            {collapsed ? (
              <span className="font-syne font-bold text-primary text-base" title="SpotYourVibe">S</span>
            ) : (
              <span className="font-syne font-bold text-primary text-base tracking-tight whitespace-nowrap">
                SpotYourVibe
              </span>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} collapsed={collapsed} />
            ))}
          </nav>

          {/* User section */}
          <div className="px-2 py-4 border-t border-border space-y-2 shrink-0">
            <div
              className={[
                'flex items-center gap-3',
                collapsed ? 'justify-center' : 'px-2',
              ].join(' ')}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name ?? 'Profile'}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-[#1f1f1f] shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1f1f1f] flex items-center justify-center text-xs font-medium text-white font-mono shrink-0">
                  {initials}
                </div>
              )}
              {!collapsed && (
                <span className="text-sm text-primary truncate flex-1 whitespace-nowrap">
                  {user?.display_name ?? '—'}
                </span>
              )}
            </div>

            <button
              onClick={handleLogout}
              title={collapsed ? 'Sign out' : undefined}
              className={[
                'flex items-center gap-2 text-xs text-[#666666] hover:text-white transition-colors rounded-lg',
                collapsed ? 'w-full justify-center py-2' : 'px-2 py-1.5',
              ].join(' ')}
            >
              <LogOut size={15} className="shrink-0" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        </aside>

        {/* Collapse toggle pill — sits outside aside so overflow-hidden doesn't clip it */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="group absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors duration-200 hover:bg-[#2a2a2a] z-10"
          style={{
            left: '100%',
            width: 20,
            height: 48,
            borderRadius: '0 12px 12px 0',
            background: '#1f1f1f',
            border: '1px solid #2a2a2a',
            borderLeft: 'none',
          }}
        >
          {collapsed
            ? <ChevronRight size={14} className="text-[#666666] group-hover:text-[#f5f5f5] transition-colors duration-200" />
            : <ChevronLeft  size={14} className="text-[#666666] group-hover:text-[#f5f5f5] transition-colors duration-200" />
          }
        </button>
      </div>

      {/* ── Mobile bottom nav ── */}
      <MobileNav />
    </>
  )
}
