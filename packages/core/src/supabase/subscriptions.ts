import { getSupabase } from './client'

// Billing is PayFast-only (SA market) — see IMPLEMENTATION.md Phase 4.
// Writes never happen client-side: RLS on `subscriptions` grants SELECT only,
// and the ITN webhook updates rows with the service role.

export type SubscriptionTier = 'free' | 'plus' | 'family'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing'

export interface Subscription {
  id: string
  family_id: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  payfast_subscription_token: string | null
  payfast_payment_id: string | null
  next_billing_date: string | null
  trial_ends_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface TierPlan {
  tier: SubscriptionTier
  name: string
  /** Monthly price in ZAR. */
  price: number
  tagline: string
  features: string[]
  /** null = unlimited */
  maxMembers: number | null
  maxRoutines: number | null
}

export const TIER_PLANS: Record<SubscriptionTier, TierPlan> = {
  free: {
    tier: 'free',
    name: 'Free',
    price: 0,
    tagline: 'The essentials for one household',
    features: [
      'Tasks, calendar and shopping',
      'Up to 5 family members',
      'Up to 3 routines',
      'Notifications',
    ],
    maxMembers: 5,
    maxRoutines: 3,
  },
  plus: {
    tier: 'plus',
    name: 'Kinnect Plus',
    price: 99,
    tagline: 'For busy families who coordinate daily',
    features: [
      'Everything in Free',
      'Up to 10 family members',
      'Unlimited routines',
      'Instant sync across devices',
      'Custom routine templates',
    ],
    maxMembers: 10,
    maxRoutines: null,
  },
  family: {
    tier: 'family',
    name: 'Kinnect Family',
    price: 149,
    tagline: 'For multi-generational households',
    features: [
      'Everything in Plus',
      'Unlimited family members',
      'Priority support',
    ],
    maxMembers: null,
    maxRoutines: null,
  },
}

/** A tier counts as paid only while its subscription is actually in good standing. */
export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier === 'plus' || tier === 'family'
}

export async function getSubscription(familyId: string): Promise<Subscription | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('family_id', familyId)
    .maybeSingle()

  if (error) throw error
  return (data as Subscription | null) ?? null
}

/**
 * Effective tier for a family. Falls back to `free` when there is no row, and
 * treats a cancelled or past-due subscription as free so access follows
 * payment state rather than the tier column alone.
 */
export async function getFamilyTier(familyId: string): Promise<SubscriptionTier> {
  const subscription = await getSubscription(familyId)
  if (!subscription) return 'free'
  if (subscription.status === 'cancelled' || subscription.status === 'past_due') return 'free'
  return subscription.tier
}
