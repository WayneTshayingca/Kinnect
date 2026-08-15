import { useState, useCallback, useEffect } from 'react'
import { useRealtimeSync } from './useRealtimeSync'

/**
 * Collapses the load → setState → useEffect → useRealtimeSync boilerplate
 * that was previously hand-rolled identically in every tab screen.
 *
 * `fetcher` should fetch data and call the screen's own setState — the hook
 * only owns the loading/refreshing lifecycle and realtime wiring around it.
 */
export function useScreenData(
  familyId: string | null | undefined,
  fetcher: () => Promise<void>,
  realtimeTables: string[]
) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const reload = useCallback(async (quiet = false) => {
    if (!familyId) return
    if (!quiet) setLoading(true)
    try {
      await fetcher()
    } catch {
      // silently fail — screens already show reasonable empty states
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [familyId, fetcher])

  useEffect(() => { reload() }, [reload])

  // Skip subscribing entirely when a screen opts out (empty table list) —
  // matches family.tsx, which intentionally has no realtime wiring.
  const onSync = Object.fromEntries(realtimeTables.map((table) => [table, () => reload(true)]))
  useRealtimeSync(realtimeTables.length > 0 ? familyId : undefined, onSync)

  const refresh = useCallback(() => {
    setRefreshing(true)
    reload(true)
  }, [reload])

  return { loading, refreshing, reload, refresh }
}
