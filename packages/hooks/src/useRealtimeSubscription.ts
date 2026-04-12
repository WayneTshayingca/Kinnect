import { useEffect, useRef } from 'react'
import { getSupabase } from '@kinnect/core'

/**
 * Subscribes to Supabase Postgres Changes for live cross-device sync.
 *
 * Platform-agnostic — works on web and React Native.
 * This is the portable core of realtime sync; each platform wraps it to add
 * their own background/foreground detection (visibilitychange on web,
 * AppState on React Native) and optional cross-instance messaging.
 *
 * @param familyId  The family to subscribe to. Subscription is skipped when null/undefined.
 * @param onSync    Map of table name → reload callback. Stable reference preferred (use useRef).
 */
export function useRealtimeSubscription(
  familyId: string | null | undefined,
  onSync: Record<string, () => void>
): void {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  useEffect(() => {
    if (!familyId) return

    const supabase = getSupabase()
    const tables = Object.keys(onSyncRef.current)

    // Unique channel name prevents collisions on effect re-runs (React strict mode etc.)
    let channel = supabase.channel(`family:${familyId}:${Date.now()}`)

    for (const table of tables) {
      // list_items has no family_id column — RLS handles scoping instead
      const config: {
        event: '*'
        schema: 'public'
        table: string
        filter?: string
      } = { event: '*', schema: 'public', table }

      if (table !== 'list_items') {
        config.filter = `family_id=eq.${familyId}`
      }

      channel = channel.on('postgres_changes', config, () => {
        onSyncRef.current[table]?.()
      })
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [familyId])
}
