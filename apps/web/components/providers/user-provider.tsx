'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as Sentry from '@sentry/nextjs'
import { getCurrentUser, getSupabase, type User } from '@kinnect/core'
import logger from '@/lib/logger'

interface UserContextType {
  user: User | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType>({ user: null, loading: true, refreshUser: async () => {} })

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const u = await getCurrentUser()
      setUser(u)
    } catch (err) {
      logger.error('Auth error', err)
    }
  }, [])

  useEffect(() => {
    const supabase = getSupabase()

    // Fast path: getSession() reads from localStorage — no network round-trip.
    // We use the cached auth user ID to fetch the profile directly (1 DB call).
    // After rendering, we validate the token in the background to catch revoked sessions.
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!session?.user) {
          setLoading(false)
          return
        }

        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle()

        if (error) logger.error('Auth error', error)
        setUser(userData ?? null)
        setLoading(false)

        // Background: validate JWT with Supabase auth server — detects revoked tokens
        supabase.auth.getUser().then(({ data: { user: authUser }, error: authErr }) => {
          if (authErr || !authUser) setUser(null)
        })
      })
      .catch((err) => {
        logger.error('Auth error', err)
        setLoading(false)
      })
  }, [])

  // Set Sentry user context (POPIA: only pseudonymous ID, no email/name/phone)
  useEffect(() => {
    if (user) {
      Sentry.setUser({ id: user.id })
      Sentry.setTag('user_role', user.role ?? 'member')
      Sentry.setTag('family_id', user.family_id ?? 'none')
    } else {
      Sentry.setUser(null)
    }
  }, [user])

  return (
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}
