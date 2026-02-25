const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const

type LogLevel = keyof typeof LEVELS

type LogPayload = Record<string, unknown>

function normalizeLevel(value?: string | null): LogLevel {
  const normalized = value?.toLowerCase()
  if (normalized && normalized in LEVELS) {
    return normalized as LogLevel
  }
  return 'warn'
}

const ENABLED = String(process.env.API_LOGGING || process.env.NEXT_PUBLIC_API_LOGGING || '').toLowerCase() === 'true'
const LEVEL = normalizeLevel(process.env.API_LOG_LEVEL)
const parsedMinStatus = Number.parseInt(process.env.API_LOG_MIN_STATUS || '', 10)
const MIN_STATUS = Number.isFinite(parsedMinStatus) ? parsedMinStatus : 400

function shouldLogLevel(level: LogLevel) {
  return ENABLED && LEVELS[level] >= LEVELS[LEVEL]
}

function formatPayload(message: string, payload?: LogPayload) {
  if (!payload || Object.keys(payload).length === 0) {
    return message
  }
  return `${message} ${JSON.stringify(payload)}`
}

function log(level: LogLevel, message: string, payload?: LogPayload) {
  if (!shouldLogLevel(level)) return
  const text = formatPayload(message, payload)
  switch (level) {
    case 'debug':
    case 'info':
      console.log(text)
      break
    case 'warn':
      console.warn(text)
      break
    case 'error':
      console.error(text)
      break
  }
}

export function logDebug(message: string, payload?: LogPayload) {
  log('debug', message, payload)
}

export function logInfo(message: string, payload?: LogPayload) {
  log('info', message, payload)
}

export function logWarn(message: string, payload?: LogPayload) {
  log('warn', message, payload)
}

export function logError(message: string, payload?: LogPayload) {
  log('error', message, payload)
}

export function isApiLoggingEnabled() {
  return ENABLED
}

export function getApiLogMinimumStatus() {
  return MIN_STATUS
}

export type { LogLevel }
