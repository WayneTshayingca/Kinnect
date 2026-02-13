'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, type User } from '@kinnect/core'

interface UserContextType {
  user: User | null
  loading: boolean
}

const UserContext = createContext<UserContextType>({ user: null, loading: true })

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch((err) => console.error('Auth error:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  )
}
