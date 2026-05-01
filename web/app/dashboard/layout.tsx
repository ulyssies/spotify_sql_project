'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { AuthGuard } from '@/components/layout/AuthGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMapPage = pathname === '/dashboard/map'

  return (
    <AuthGuard>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          <Navbar />
          <main
            className={
              isMapPage ? 'flex-1 overflow-hidden h-screen' : 'flex-1 overflow-y-auto p-6'
            }
          >
            <div
              className={
                isMapPage
                  ? 'h-full min-h-0 min-w-0 w-full flex flex-col'
                  : 'max-w-4xl mx-auto'
              }
            >
              <Suspense fallback={null}>{children}</Suspense>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
