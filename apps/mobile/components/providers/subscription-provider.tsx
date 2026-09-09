import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getFamilyTier, isPaidTier, TIER_PLANS, type SubscriptionTier } from '@kinnect/core'
import { useUser } from './user-provider'

// Mobile mirror of the web subscription provider. Tier is read-only here:
// only the PayFast ITN webhook can change it, server-side.

interface SubscriptionContextType {
  tier: SubscriptionTier
  loading: boolean
  isPaid: boolean
  /** null means unlimited. */
  maxMembers: number | null
  maxRoutines: number | null
  refreshTier: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: 'free',
  loading: true,
  isPaid: false,
  maxMembers: TIER_PLANS.free.maxMembers,
  maxRoutines: TIER_PLANS.free.maxRoutines,
  refreshTier: async () => {},
})

export function useSubscription() {
  return useContext(SubscriptionContext)
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const [tier, setTier] = useState<SubscriptionTier>('free')
  const [loading, setLoading] = useState(true)

  const familyId = user?.family_id

  const refreshTier = useCallback(async () => {
    if (!familyId) {
      setTier('free')
      setLoading(false)
      return
    }
    try {
      setTier(await getFamilyTier(familyId))
    } catch {
      // Fall back to free rather than granting access we can't verify.
      setTier('free')
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    refreshTier()
  }, [refreshTier])

  const plan = TIER_PLANS[tier]

  return (
    // @ts-ignore - React 19 Context type compatibility (same as user-provider)
    <SubscriptionContext.Provider
      value={{
        tier,
        loading,
        isPaid: isPaidTier(tier),
        maxMembers: plan.maxMembers,
        maxRoutines: plan.maxRoutines,
        refreshTier,
      }}
    >
      {children as any}
    </SubscriptionContext.Provider>
  )
}
