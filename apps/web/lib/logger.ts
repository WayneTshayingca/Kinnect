import * as Sentry from '@sentry/nextjs'

function isServer() {
  return typeof window === 'undefined'
}

// NEXT_PUBLIC_DEBUG_DOMAINS=auth,tasks — only emit debug for listed domains.
// Leave unset (or set to "*") to show all debug logs.
function isDebugDomainEnabled(domain?: string): boolean {
  const raw = process.env.NEXT_PUBLIC_DEBUG_DOMAINS
  if (!raw || raw === '*') return true
  if (!domain) return false
  return raw.split(',').map((d) => d.trim()).includes(domain)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pinoInstance: any = null

// Lazily initialize pino on the server only
async function getPino() {
  if (!isServer()) return null
  if (!pinoInstance) {
    const pinoModule = await import('pino')
    const pino = pinoModule.default
    pinoInstance = pino({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(process.env.NODE_ENV !== 'production' && {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
      }),
    })
  }
  return pinoInstance
}

const logger = {
  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    if (isServer()) {
      getPino().then((p) => p?.error({ err: error, ...context }, message))
    } else {
      console.error(`[ERROR] ${message}`, error, context || '')
    }
    Sentry.captureException(error instanceof Error ? error : new Error(message), {
      extra: { message, ...context },
    })
    Sentry.logger.error(message, { error: error instanceof Error ? error.message : String(error), ...context })
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (isServer()) {
      getPino().then((p) => p?.warn(context ?? {}, message))
    } else {
      console.warn(`[WARN] ${message}`, context || '')
    }
    Sentry.logger.warn(message, context ?? {})
  },

  info(message: string, context?: Record<string, unknown>) {
    if (isServer()) {
      getPino().then((p) => p?.info(context ?? {}, message))
    } else {
      console.info(`[INFO] ${message}`, context || '')
    }
    Sentry.logger.info(message, context ?? {})
  },

  debug(message: string, context?: Record<string, unknown> & { domain?: string }) {
    const { domain, ...rest } = context ?? {}
    if (process.env.NODE_ENV === 'production') return
    if (!isDebugDomainEnabled(domain)) return
    if (isServer()) {
      getPino().then((p) => p?.debug({ domain, ...rest }, message))
    } else {
      console.debug(`[DEBUG]${domain ? ` [${domain}]` : ''} ${message}`, Object.keys(rest).length ? rest : '')
    }
  },
}

export default logger
