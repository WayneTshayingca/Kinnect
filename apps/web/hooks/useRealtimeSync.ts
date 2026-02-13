import {useCallback, useEffect, useRef} from 'react'
import {getSupabase} from '@kinnect/core'

/**
 * Subscribes to Supabase Postgres Changes for live cross-device sync
 * and uses BroadcastChannel for instant cross-tab sync (same browser).
 *
 * - Postgres Changes: real-time DB events via Supabase Realtime
 * - BroadcastChannel: instant sync across tabs on the same browser
 * - Returns a `broadcast` function to notify other tabs immediately
 */
export function useRealtimeSync(
  familyId: string | null | undefined,
  onSync: Record<string, () => void>
) {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  // Cross-tab sync via BroadcastChannel (instant, same browser)
  useEffect(() => {
    if (!familyId) return

    const bc = new BroadcastChannel(`kinnect:${familyId}`)
    bc.onmessage = (event) => {
      const table = event.data?.table
      if (table && onSyncRef.current[table]) {
        onSyncRef.current[table]()
      }
    }

    return () => bc.close()
  }, [familyId])

  // Supabase Postgres Changes for cross-device sync
  useEffect(() => {
    if (!familyId) return

    const supabase = getSupabase()
    const tables = Object.keys(onSyncRef.current)

    let channel = supabase.channel(`family:${familyId}`)

    for (const table of tables) {
      // list_items doesn't have family_id — subscribe without filter (RLS handles visibility)
      const config: {
        event: '*'
        schema: 'public'
        table: string
        filter?: string
      } = {
        event: '*',
        schema: 'public',
        table,
      }

      if (table !== 'list_items') {
        config.filter = `family_id=eq.${familyId}`
      }

      channel = channel.on('postgres_changes', config, () => {
        if (onSyncRef.current[table]) {
          onSyncRef.current[table]()
        }
      })
    }

    channel.subscribe((status) => {
      console.log('[Realtime]', status)
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [familyId])

  // Refetch all data when the tab becomes visible again (mobile browsers
  // kill WebSocket connections in the background, so data may be stale)
  useEffect(() => {
    if (!familyId) return

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        Object.values(onSyncRef.current).forEach((reload) => reload())
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [familyId])

  // Broadcast to other tabs instantly
    return useCallback((table: string) => {
      if (!familyId) return
      try {
          const bc = new BroadcastChannel(`kinnect:${familyId}`)
          bc.postMessage({table})
          bc.close()
      } catch {
          // BroadcastChannel not supported
      }
  }, [familyId])
}
