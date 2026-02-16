import type { ErrorEvent, EventHint, TransactionEvent } from '@sentry/core'

// South African ID numbers: 13 consecutive digits (YYMMDD SSSS C A Z)
const SA_ID_REGEX = /\b\d{13}\b/g
// Credit card numbers: 13-19 digits, optionally separated by spaces/dashes
const CREDIT_CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g
// JWT tokens
const JWT_REGEX = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_.+/=-]+/g
// Bearer tokens
const BEARER_REGEX = /Bearer\s+[A-Za-z0-9_.+/=-]+/gi

const SENSITIVE_KEYS = [
  'password', 'passwd', 'secret', 'token', 'authorization',
  'cookie', 'session', 'creditcard', 'credit_card', 'cardnumber',
  'card_number', 'cvv', 'cvc', 'id_number', 'idnumber',
  'phone', 'phone_number', 'push_token', 'email',
  'access_token', 'refresh_token',
]

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  return SENSITIVE_KEYS.some((s) => lower.includes(s))
}

function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') {
    let scrubbed = value
    scrubbed = scrubbed.replace(SA_ID_REGEX, '[REDACTED_SA_ID]')
    scrubbed = scrubbed.replace(CREDIT_CARD_REGEX, '[REDACTED_CARD]')
    scrubbed = scrubbed.replace(JWT_REGEX, '[REDACTED_JWT]')
    scrubbed = scrubbed.replace(BEARER_REGEX, 'Bearer [REDACTED]')
    return scrubbed
  }
  return value
}

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]'
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = scrubObject(value as Record<string, unknown>)
    } else {
      result[key] = scrubValue(value)
    }
  }
  return result
}

export function beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  // Scrub request data
  if (event.request) {
    if (event.request.headers) {
      event.request.headers = scrubObject(event.request.headers) as Record<string, string>
    }
    if (event.request.cookies) {
      event.request.cookies = scrubObject(event.request.cookies) as Record<string, string>
    }
    if (event.request.data && typeof event.request.data === 'object') {
      event.request.data = scrubObject(event.request.data as Record<string, unknown>)
    }
    if (event.request.query_string) {
      event.request.query_string = scrubValue(event.request.query_string) as string
    }
  }

  // Scrub breadcrumbs
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
      if (breadcrumb.data && typeof breadcrumb.data === 'object') {
        breadcrumb.data = scrubObject(breadcrumb.data as Record<string, unknown>)
      }
      if (breadcrumb.message) {
        breadcrumb.message = scrubValue(breadcrumb.message) as string
      }
      return breadcrumb
    })
  }

  // Scrub extra context
  if (event.extra && typeof event.extra === 'object') {
    event.extra = scrubObject(event.extra as Record<string, unknown>)
  }

  // Scrub exception messages for embedded PII
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((ex) => {
      if (ex.value) {
        ex.value = scrubValue(ex.value) as string
      }
      return ex
    })
  }

  return event
}

export function beforeSendTransaction(event: TransactionEvent): TransactionEvent | null {
  const name = event.transaction ?? ''
  if (
    name.includes('/api/health') ||
    name.includes('/api/sentry-example') ||
    name.includes('_next/data')
  ) {
    return null
  }

  if (event.request?.headers) {
    event.request.headers = scrubObject(event.request.headers) as Record<string, string>
  }

  return event
}

export const denyUrls: Array<string | RegExp> = [
  /extensions\//i,
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /doubleclick\.net/i,
  /facebook\.net/i,
  /hotjar\.com/i,
  /graph\.facebook\.com/i,
]
