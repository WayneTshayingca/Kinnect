import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useRealtimeSubscription } from '@kinnect/hooks'

/**
 * Mobile wrapper around the shared useRealtimeSubscription hook.
 *
 * Adds the React Native equivalent of web's visibilitychange handling:
 * Supabase's WebSocket is dropped when the app is backgrounded, so on
 * returning to the foreground we refetch everything rather than rely on
 * missed postgres_changes events.
 *
 * Web equivalent: apps/web/hooks/useRealtimeSync.ts (adds BroadcastChannel
 * for cross-tab sync too, which has no meaningful mobile analogue).
 */
export function useRealtimeSync(
  familyId: string | null | undefined,
  onSync: Record<string, () => void>
) {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync

  // ── Portable: Supabase Postgres Changes (cross-device) ──────────────
  useRealtimeSubscription(familyId, onSync)

  // ── Mobile-only: refetch when app returns to foreground ─────────────
  useEffect(() => {
    if (!familyId) return

    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'active') {
        Object.values(onSyncRef.current).forEach((reload) => reload())
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [familyId])
}