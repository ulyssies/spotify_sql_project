'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Music2,
  Mic2,
  BarChart2,
  Sparkles,
  Upload,
  Network,
  Clock,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard/tracks',          label: 'Top Tracks',      Icon: Music2    },
  { href: '/dashboard/artists',         label: 'Top Artists',     Icon: Mic2      },
  { href: '/dashboard/map',             label: 'Music Map',       Icon: Network   },
  { href: '/dashboard/history',         label: 'History',         Icon: Clock     },
  { href: '/dashboard/genres',          label: 'Genres',          Icon: BarChart2 },
  { href: '/dashboard/recommendations', label: 'Recommendations', Icon: Sparkles  },
  { href: '/dashboard/import',          label: 'Import Data',     Icon: Upload    },
]

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const range = searchParams.get('range')

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
      </div>
    </nav>
  )
}
