import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

let supabaseClient: SupabaseClient<Database> | null = null

export function initSupabase(url: string, anonKey: string): SupabaseClient<Database> {
  if (!supabaseClient) {
    supabaseClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })

    // Keep the Realtime client's JWT in sync with the auth session.
    // Without this, presence/broadcast channels time out because the
    // WebSocket only has the anon key, not the user's access token.
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      supabaseClient?.realtime.setAuth(session?.access_token ?? null)
    })
  }
  return supabaseClient
}

export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Call initSupabase first.')
  }
  return supabaseClient
}

// Export a typed client directly
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient<Database>]
  }
})