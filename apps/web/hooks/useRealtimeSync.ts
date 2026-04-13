import { useCallback, useEffect, useRef } from 'react'
import { useRealtimeSubscription } from '@kinnect/hooks'


/**
 * Web wrapper around the shared useRealtimeSubscription hook.
 *
 * Adds two web-specific layers on top of the portable Supabase Postgres Changes subscription:
 *   1. BroadcastChannel — instant cross-tab sync within the same browser session
 *   2. visibilitychange  — refetch all data when a background tab regains focus
 *      (mobile browsers kill WebSocket connections in the background)
 *
 * Returns a `broadcast(table)` function that callers invoke after a local mutation
 * to notify other open tabs immediately, without waiting for the Supabase event.
 *
 * React Native equivalent: use useRealtimeSubscription directly from @kinnect/hooks
 * and add AppState-based refetch logic instead of visibilitychange.
 */
export function useRealtimeSync(
  familyId: string | null | undefined,
  onSync: Record<string, () => void>
) {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  // ── Portable: Supabase Postgres Changes (cross-device) ──────────────
  useRealtimeSubscription(familyId, onSync)

  // ── Web-only: BroadcastChannel (instant cross-tab, same browser) ────
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

  // ── Web-only: refetch when tab regains visibility ────────────────────
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

  // ── Web-only: notify other tabs after a local write ──────────────────
  return useCallback(
    (table: string) => {
      if (!familyId) return
      try {
        const bc = new BroadcastChannel(`kinnect:${familyId}`)
        bc.postMessage({ table })
        bc.close()
      } catch {
        // BroadcastChannel not available (older browsers / server-side)
      }
    },
    [familyId]
  )
}
