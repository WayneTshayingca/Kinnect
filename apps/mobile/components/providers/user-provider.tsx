import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getCurrentUser, getUserByAuthId, getSupabase, type User } from '@kinnect/core'

interface UserContextType {
  user: User | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
})

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
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const supabase = getSupabase()

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        setUser(await getUserByAuthId(session.user.id))
      } finally {
        setLoading(false)
      }
    }).catch(() => {
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setUser(null)
      } else if (event === 'SIGNED_IN') {
        refreshUser()
      }
    })

    return () => subscription.unsubscribe()
  }, [refreshUser])

  return (
    // @ts-ignore - React 19 Context type compatibility
    <UserContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}
