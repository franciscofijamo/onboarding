import type { NextRequest } from 'next/server'
import { getApiLogMinimumStatus, isApiLoggingEnabled, logDebug, logError, logWarn } from '@/lib/logger'

type RouteParams = Record<string, string | string[]>

type RouteContext<TParams extends RouteParams = RouteParams> = {
  params: Promise<TParams>
  [key: string]: unknown
}

type RouteHandler<TParams extends RouteParams = RouteParams> = (
  request: Request,
  context: RouteContext<TParams>
) => Promise<Response> | Response

interface LoggingOptions {
  route?: string
  method?: string
  feature?: string
}

const DEBUG_ENABLED = () => isApiLoggingEnabled() && process.env.API_LOG_LEVEL?.toLowerCase() === 'debug'

function resolvePath(request: NextRequest | Request | undefined, fallback?: string) {
  if (!request) return fallback || 'unknown'
  const maybeNext = request as NextRequest
  if (typeof maybeNext.nextUrl?.pathname === 'string') {
    return maybeNext.nextUrl.pathname
  }
  try {
    return new URL(request.url).pathname
  } catch {
    return fallback || 'unknown'
  }
}

function resolveSearchParams(request: NextRequest | Request | undefined) {
  if (!request) return undefined
  const maybeNext = request as NextRequest
  try {
    const url = maybeNext.nextUrl ?? new URL(request.url)
    return Object.fromEntries(url.searchParams.entries())
  } catch {
    return undefined
  }
}

function shouldLogStatus(status: number) {
  return isApiLoggingEnabled() && status >= getApiLogMinimumStatus()
}

function normalizeParams(params?: RouteParams) {
  if (!params) return undefined
  const normalized: Record<string, string | string[]> = {}
  for (const [key, value] of Object.entries(params)) {
    normalized[key] = value
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    }
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

export function withApiLogging<TParams extends RouteParams = RouteParams>(
  handler: RouteHandler<TParams>,
  options: LoggingOptions = {}
) {
  return async function wrappedHandler(
    request: Request,
    context: RouteContext<TParams>
  ) {
    if (!isApiLoggingEnabled()) {
      return handler(request, context)
    }

    const route = options.route || resolvePath(request)
    const method = options.method || request?.method || 'UNKNOWN'
    const requestId =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`
    const startedAt = Date.now()

    try {
      const response = await handler(request, context)
      if (!response) {
        return response
      }

      const status = response.status
      const durationMs = Date.now() - startedAt
      
      // Resolve params for logging if available
      let resolvedParams: RouteParams | undefined
      try {
        if (context?.params) {
          resolvedParams = await context.params
        }
      } catch {
        // Ignore param resolution errors for logging
      }

      if (shouldLogStatus(status)) {
        const level = status >= 500 ? logError : logWarn
        level('API response emitted non-success status', {
          status,
          method,
          route,
          durationMs,
          requestId,
          feature: options.feature,
          params: normalizeParams(resolvedParams),
          query: resolveSearchParams(request),
        })
      } else if (DEBUG_ENABLED()) {
        logDebug('API response', {
          status,
          method,
          route,
          durationMs,
          requestId,
          feature: options.feature,
        })
      }

      return response
    } catch (error) {
      const durationMs = Date.now() - startedAt
      logError('API handler threw an error', {
        method,
        route,
        durationMs,
        requestId,
        feature: options.feature,
        error: serializeError(error),
      })
      throw error
    }
  }
}
