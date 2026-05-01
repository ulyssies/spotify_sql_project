import { Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { AuthGuard } from '@/components/layout/AuthGuard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          <Navbar />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8">
              <Suspense fallback={null}>
                {children}
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
