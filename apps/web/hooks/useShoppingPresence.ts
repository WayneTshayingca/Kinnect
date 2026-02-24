import { useEffect, useRef, useState } from 'react'
import { getSupabase } from '@kinnect/core'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PresencePayload {
  userId: string
  name: string
}

/**
 * Tracks whether the current user is in shopping mode and returns
 * the names of other family members who are also currently shopping.
 *
 * Uses Supabase Realtime presence — state clears automatically when
 * the user closes the tab, navigates away, or exits shopping mode.
 */
export function useShoppingPresence(
  familyId: string | null | undefined,
  userId: string | null | undefined,
  userName: string | null | undefined,
  isShoppingMode: boolean
): string[] {
  const [otherShoppers, setOtherShoppers] = useState<string[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)
  const isShoppingModeRef = useRef(isShoppingMode)
  isShoppingModeRef.current = isShoppingMode

  const displayName = userName || 'Family member'
  const displayNameRef = useRef(displayName)
  displayNameRef.current = displayName

  // Create the channel once per identity — don't recreate on every mode toggle
  useEffect(() => {
    if (!familyId || !userId) return

    const supabase = getSupabase()
    let cancelled = false

    // Set the JWT before creating the channel so presence auth works
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return

      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }

      const channel = supabase.channel(`shopping:${familyId}`)
      channelRef.current = channel
      subscribedRef.current = false

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresencePayload>()
        const others: string[] = []
        for (const presences of Object.values(state)) {
          for (const presence of presences) {
            if (presence.userId !== userId && presence.name) {
              others.push(presence.name)
            }
          }
        }
        setOtherShoppers(others)
      })

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          subscribedRef.current = true
          if (isShoppingModeRef.current) {
            await channel.track({ userId, name: displayNameRef.current })
          }
        }
      })
    })

    return () => {
      cancelled = true
      subscribedRef.current = false
      if (channelRef.current) {
        getSupabase().removeChannel(channelRef.current).catch(() => {})
        channelRef.current = null
      }
    }
  }, [familyId, userId]) // stable — does NOT include isShoppingMode

  // Track/untrack when mode toggles, only once the channel is subscribed
  useEffect(() => {
    if (!channelRef.current || !subscribedRef.current || !userId) return

    if (isShoppingMode) {
      channelRef.current.track({ userId, name: displayName }).catch(() => {})
    } else {
      channelRef.current.untrack().catch(() => {})
    }
  }, [isShoppingMode, userId, displayName])

  return otherShoppers
}
