import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns/promises'
import logger from '@/lib/logger'
import {
  payfastConfig,
  signPayload,
  validateItn,
  PAYFAST_ITN_HOSTS,
  TIER_PRICES,
  isPayableTier,
} from '@/lib/payfast'

// PayFast ITN (Instant Transaction Notification) webhook.
//
// This is the only thing that grants a paid tier, so it verifies four things
// before touching the database, per PayFast's security guidance:
//   1. the signature matches our passphrase
//   2. the request came from a PayFast IP
//   3. PayFast itself confirms the payload is valid
//   4. the amount matches what the tier actually costs
//
// PayFast expects a 200 on receipt regardless — a non-200 makes it retry — so
// failures are logged and answered with 200 unless the work genuinely can be
// retried.

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('PayFast ITN: server misconfigured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const params = new URLSearchParams(rawBody)
  const payload = Object.fromEntries(params.entries())

  // 1. Signature — recompute over every field except the signature itself,
  //    in the order PayFast posted them.
  const received = params.get('signature') ?? ''
  const pairs: [string, string][] = [...params.entries()].filter(([key]) => key !== 'signature')

  let config
  try {
    config = payfastConfig()
  } catch (err) {
    logger.error('PayFast ITN: not configured', err)
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const expected = signPayload(pairs, config.passphrase)
  if (expected !== received) {
    logger.error('PayFast ITN: signature mismatch', undefined, { m_payment_id: payload.m_payment_id })
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // 2. Source — the posting host must resolve to one of PayFast's.
  if (!(await isFromPayfast(request))) {
    logger.error('PayFast ITN: rejected non-PayFast source')
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // 3. PayFast's own confirmation of the payload.
  if (!(await validateItn(rawBody))) {
    logger.error('PayFast ITN: PayFast did not validate the payload')
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const familyId = payload.custom_str1 || payload.m_payment_id
  const tier = payload.custom_str2
  const paymentStatus = payload.payment_status

  if (!familyId || !isPayableTier(tier)) {
    logger.error('PayFast ITN: missing family or tier', undefined, { familyId, tier })
    return NextResponse.json({ received: true }, { status: 200 })
  }

  // 4. Amount — never trust the tier alone; confirm what was actually paid.
  const grossAmount = parseFloat(payload.amount_gross ?? '0')
  const expectedAmount = TIER_PRICES[tier]
  if (paymentStatus === 'COMPLETE' && Math.abs(grossAmount - expectedAmount) > 0.01) {
    logger.error('PayFast ITN: amount mismatch', undefined, { grossAmount, expectedAmount, familyId })
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // PayFast sends several statuses over a subscription's life.
  const update = buildUpdate(paymentStatus, tier, payload)
  if (!update) {
    logger.info('PayFast ITN: ignoring status', { paymentStatus, familyId })
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const { error } = await admin
    .from('subscriptions')
    .upsert({ family_id: familyId, ...update }, { onConflict: 'family_id' })

  if (error) {
    // A DB failure is worth a retry, so this one does return non-200.
    logger.error('PayFast ITN: failed to update subscription', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  logger.info('PayFast ITN: subscription updated', { familyId, tier, paymentStatus })
  return NextResponse.json({ received: true }, { status: 200 })
}

function buildUpdate(
  paymentStatus: string,
  tier: 'plus' | 'family',
  payload: Record<string, string>
) {
  switch (paymentStatus) {
    case 'COMPLETE':
      return {
        tier,
        status: 'active' as const,
        payfast_subscription_token: payload.token || null,
        payfast_payment_id: payload.pf_payment_id || null,
        next_billing_date: payload.billing_date || null,
        cancelled_at: null,
      }
    case 'CANCELLED':
      return {
        tier: 'free' as const,
        status: 'cancelled' as const,
        cancelled_at: new Date().toISOString(),
      }
    case 'FAILED':
      return { status: 'past_due' as const }
    default:
      return null
  }
}

/** Resolves PayFast's published hostnames and checks the caller against them. */
async function isFromPayfast(request: NextRequest): Promise<boolean> {
  const forwarded = request.headers.get('x-forwarded-for')
  const callerIp = forwarded?.split(',')[0]?.trim()
  if (!callerIp) return false

  const resolved = await Promise.all(
    PAYFAST_ITN_HOSTS.map((host) => dns.resolve4(host).catch(() => [] as string[]))
  )
  return resolved.flat().includes(callerIp)
}
