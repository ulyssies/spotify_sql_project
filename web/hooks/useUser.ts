'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import type { User } from '@/lib/types'

export function useUser() {
  const { data, error, isLoading } = useSWR<User>(
    isAuthenticated() ? 'user' : null,
    api.getMe,
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  )
  return { user: data, error, isLoading }
}
