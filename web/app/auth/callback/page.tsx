'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setToken } from '@/lib/auth'

function CallbackContent() {
  const router = useRouter()

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const queryParams = new URLSearchParams(window.location.search)
    const token = hashParams.get('token') ?? queryParams.get('token')

    if (token) {
      setToken(token)
      router.replace('/dashboard/tracks')
    } else {
      router.replace('/?error=auth_failed')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-muted text-xs tracking-widest uppercase">
          Connecting
        </p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
