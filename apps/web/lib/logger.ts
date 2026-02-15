import * as Sentry from '@sentry/nextjs'

function isServer() {
  return typeof window === 'undefined'
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
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (isServer()) {
      getPino().then((p) => p?.warn(context ?? {}, message))
    } else {
      console.warn(`[WARN] ${message}`, context || '')
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    if (isServer()) {
      getPino().then((p) => p?.info(context ?? {}, message))
    } else {
      console.info(`[INFO] ${message}`, context || '')
    }
  },

  debug(message: string, context?: Record<string, unknown>) {
    if (isServer()) {
      getPino().then((p) => p?.debug(context ?? {}, message))
    } else if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, context || '')
    }
  },
}

export default logger
