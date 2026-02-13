'use client'

import { useRef } from 'react'
import { initSupabase } from '@kinnect/core'

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false)

  if (!initialized.current) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      initSupabase(supabaseUrl, supabaseAnonKey)
      initialized.current = true
    }
  }

  if (!initialized.current) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Missing Supabase configuration</div>
      </div>
    )
  }

  return <>{children}</>
}
