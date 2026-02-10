'use client'

import { useEffect, useState } from 'react'
import { initSupabase } from '@kinnect/core'

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables!')
      console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing')
      return
    }

    console.log('Initializing Supabase with URL:', supabaseUrl)
    initSupabase(supabaseUrl, supabaseAnonKey)
    setInitialized(true)
    console.log('Supabase initialized successfully!')
  }, [])

  if (!initialized) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600">Initializing...</div>
    </div>
  }

  return <>{children}</>
}