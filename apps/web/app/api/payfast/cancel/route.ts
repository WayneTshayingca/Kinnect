import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import logger from '@/lib/logger'
import { payfastConfig, payfastHost, isSandbox } from '@/lib/payfast'

// Cancels a family's PayFast recurring subscription.
//
// PayFast's subscription API is separate from the checkout flow: it is signed
// per-request over the headers, not the body. Docs:
// https://developers.payfast.co.za/docs#recurring_billing

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

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

  const { data: caller } = await callerClient
    .from('users')
    .select('role, active_family_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!caller?.active_family_id) {
    return NextResponse.json({ error: 'No active family' }, { status: 400 })
  }
  if (caller.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can change the family plan' }, { status: 403 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('payfast_subscription_token, tier, status')
    .eq('family_id', caller.active_family_id)
    .maybeSingle()

  if (!subscription || subscription.tier === 'free') {
    return NextResponse.json({ error: 'No paid plan to cancel' }, { status: 400 })
  }

  const token = subscription.payfast_subscription_token
  if (token) {
    let config
    try {
      config = payfastConfig()
    } catch (err) {
      logger.error('PayFast cancel: not configured', err)
      return NextResponse.json({ error: 'Billing is not available right now' }, { status: 503 })
    }

    const timestamp = new Date().toISOString()
    const headerPairs: [string, string][] = [
      ['merchant-id', config.merchantId],
      ['timestamp', timestamp],
      ['version', 'v1'],
    ]
    // The subscription API signs the sorted headers, not the request body.
    const signatureBase = [...headerPairs]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
      .concat(config.passphrase ? [`passphrase=${encodeURIComponent(config.passphrase).replace(/%20/g, '+')}`] : [])
      .join('&')
    const signature = crypto.createHash('md5').update(signatureBase).digest('hex')

    const res = await fetch(`${payfastHost()}/subscriptions/${token}/cancel${isSandbox() ? '?testing=true' : ''}`, {
      method: 'PUT',
      headers: {
        'merchant-id': config.merchantId,
        timestamp,
        version: 'v1',
        signature,
      },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.error('PayFast cancel: API call failed', undefined, { status: res.status, body })
      return NextResponse.json({ error: 'Could not cancel with PayFast' }, { status: 502 })
    }
  } else {
    logger.warn('PayFast cancel: no token on subscription, downgrading locally', {
      familyId: caller.active_family_id,
    })
  }

  // PayFast also sends a CANCELLED ITN, but downgrade immediately so the UI is
  // correct without waiting for the webhook. The ITN is idempotent.
  const { error } = await admin
    .from('subscriptions')
    .update({
      tier: 'free',
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('family_id', caller.active_family_id)

  if (error) {
    logger.error('PayFast cancel: failed to update subscription', error)
    return NextResponse.json({ error: 'Cancelled with PayFast but failed to update' }, { status: 500 })
  }

  return NextResponse.json({ cancelled: true })
}
