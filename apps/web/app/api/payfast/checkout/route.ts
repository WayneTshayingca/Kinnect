import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import logger from '@/lib/logger'
import { payfastConfig, payfastHost, signPayload, TIER_PRICES, isPayableTier } from '@/lib/payfast'

// Builds a signed PayFast subscription checkout URL for the caller's family.
// The client never sees the merchant key or passphrase — it only receives the
// redirect URL. Mobile opens the same URL in an in-app browser.

const checkoutSchema = z.object({
  tier: z.enum(['plus', 'family']),
})

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!supabaseUrl || !supabaseAnonKey || !appUrl) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Verify the caller is authenticated
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user: authUser }, error: authError } = await callerClient.auth.getUser()
  if (authError || !authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Choose a valid plan' }, { status: 400 })
  }
  const { tier } = parsed.data

  // Only an admin can put the family onto a paid plan.
  const { data: caller } = await callerClient
    .from('users')
    .select('id, name, role, active_family_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!caller?.active_family_id) {
    return NextResponse.json({ error: 'No active family' }, { status: 400 })
  }
  if (caller.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change the family plan' }, { status: 403 })
  }

  if (!isPayableTier(tier)) {
    return NextResponse.json({ error: 'Choose a valid plan' }, { status: 400 })
  }

  let config
  try {
    config = payfastConfig()
  } catch (err) {
    logger.error('PayFast checkout: not configured', err)
    return NextResponse.json({ error: 'Billing is not available right now' }, { status: 503 })
  }

  const amount = TIER_PRICES[tier].toFixed(2)
  const planName = tier === 'plus' ? 'Kinnect Plus' : 'Kinnect Family'

  // Field order defines the signature, so this stays an ordered array.
  const pairs: [string, string][] = [
    ['merchant_id', config.merchantId],
    ['merchant_key', config.merchantKey],
    ['return_url', `${appUrl}/dashboard/settings?billing=success`],
    ['cancel_url', `${appUrl}/dashboard/settings?billing=cancelled`],
    ['notify_url', `${appUrl}/api/payfast/notify`],
    ['name_first', caller.name?.split(' ')[0] ?? 'Kinnect'],
    ['email_address', authUser.email ?? ''],
    // Echoed back on the ITN so the webhook knows what to update.
    ['m_payment_id', caller.active_family_id],
    ['amount', amount],
    ['item_name', `${planName} (monthly)`],
    ['custom_str1', caller.active_family_id],
    ['custom_str2', tier],
    // Recurring monthly subscription, indefinite.
    ['subscription_type', '1'],
    ['billing_date', new Date().toISOString().slice(0, 10)],
    ['recurring_amount', amount],
    ['frequency', '3'],
    ['cycles', '0'],
  ]

  const signature = signPayload(pairs, config.passphrase)
  const query = new URLSearchParams([...pairs, ['signature', signature]]).toString()

  return NextResponse.json({
    url: `${payfastHost()}/eng/process?${query}`,
  })
}
