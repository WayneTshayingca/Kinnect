import crypto from 'crypto'
import type { SubscriptionTier } from '@kinnect/core'

// PayFast is the SA payment processor — see CLAUDE.md. Do not swap in Stripe.
// Docs: https://developers.payfast.co.za/docs

export const PAYFAST_HOSTS = {
  sandbox: 'https://sandbox.payfast.co.za',
  live: 'https://www.payfast.co.za',
} as const

/** PayFast's published ITN source ranges. ITN posts from anywhere else are rejected. */
export const PAYFAST_ITN_HOSTS = [
  'www.payfast.co.za',
  'sandbox.payfast.co.za',
  'w1w.payfast.co.za',
  'w2w.payfast.co.za',
]

export function isSandbox(): boolean {
  // Anything other than an explicit "false" is treated as sandbox, so a missing
  // or malformed env var can never accidentally take real payments.
  return process.env.PAYFAST_SANDBOX !== 'false'
}

export function payfastHost(): string {
  return isSandbox() ? PAYFAST_HOSTS.sandbox : PAYFAST_HOSTS.live
}

export function payfastConfig() {
  const merchantId = process.env.PAYFAST_MERCHANT_ID
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY
  const passphrase = process.env.PAYFAST_PASSPHRASE

  if (!merchantId || !merchantKey) {
    throw new Error('PayFast is not configured (PAYFAST_MERCHANT_ID / PAYFAST_MERCHANT_KEY)')
  }

  return { merchantId, merchantKey, passphrase }
}

/**
 * PayFast's signature: MD5 over the parameters in their submitted order,
 * URL-encoded with uppercase hex and spaces as `+`, with the passphrase
 * appended when one is configured.
 *
 * Order matters and must match the order the fields are posted in, so this
 * takes an array of pairs rather than an object.
 */
export function signPayload(pairs: [string, string][], passphrase?: string): string {
  const parts = pairs
    // PayFast excludes empty values from the signature.
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${encodeForSignature(value)}`)

  if (passphrase) {
    parts.push(`passphrase=${encodeForSignature(passphrase)}`)
  }

  return crypto.createHash('md5').update(parts.join('&')).digest('hex')
}

/** PayFast expects PHP urlencode() semantics: spaces as `+`, uppercase hex. */
function encodeForSignature(value: string): string {
  return encodeURIComponent(value.trim())
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase())
}

/**
 * Confirms an ITN really came from PayFast by posting the raw payload back to
 * their validation endpoint. Returns true only on an exact "VALID" reply.
 */
export async function validateItn(rawBody: string): Promise<boolean> {
  const res = await fetch(`${payfastHost()}/eng/query/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: rawBody,
  })
  if (!res.ok) return false
  const text = (await res.text()).trim()
  return text === 'VALID'
}

/** Monthly ZAR price per tier. Mirrors TIER_PLANS in @kinnect/core. */
export const TIER_PRICES: Record<Exclude<SubscriptionTier, 'free'>, number> = {
  plus: 99,
  family: 149,
}

export function isPayableTier(tier: string): tier is Exclude<SubscriptionTier, 'free'> {
  return tier === 'plus' || tier === 'family'
}
