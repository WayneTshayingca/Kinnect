'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as Sentry from '@sentry/nextjs'
import { getCurrentUser, type User } from '@kinnect/core'
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
    getCurrentUser()
      .then(setUser)
      .catch((err) => logger.error('Auth error', err))
      .finally(() => setLoading(false))
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
