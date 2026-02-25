import type { ClerkPlanFeature, ClerkPlanMoney, ClerkPlanNormalized } from './commerce-plan-types'

const CLERK_PLAN_ENDPOINTS = ['https://api.clerk.com/v1/commerce/plans']

function parseCurrency(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toLowerCase() : null
}

function parseCurrencySymbol(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function parseAmountValue(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return Number.isInteger(value) ? value : Math.round(value * 100)
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '.').replace(/[^0-9.\-]/g, '')
    if (!normalized) return null
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) return null
    return Number.isInteger(parsed) ? parsed : Math.round(parsed * 100)
  }
  return null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function parseMoney(
  raw: unknown,
  fallbackCurrency: string | null,
  fallbackCurrencySymbol: string | null,
  fallbackFormatted?: string | null,
): ClerkPlanMoney | null {
  if (raw == null) {
    if (fallbackFormatted) {
      return {
        amount: null,
        currency: fallbackCurrency,
        currencySymbol: fallbackCurrencySymbol,
        formatted: fallbackFormatted,
      }
    }
    return null
  }
  if (typeof raw === 'number' || typeof raw === 'string') {
    const amount = parseAmountValue(raw)
    if (amount == null) return null
    return {
      amount,
      currency: fallbackCurrency,
      currencySymbol: fallbackCurrencySymbol,
      formatted: fallbackFormatted ?? null,
    }
  }
  const rawRecord = asRecord(raw)
  if (!rawRecord) {
    return null
  }
  const amount = parseAmountValue(rawRecord.amount ?? rawRecord.value)
  if (amount == null && !fallbackFormatted && !rawRecord.amount_formatted) return null
  const currency = parseCurrency(rawRecord.currency) ?? fallbackCurrency
  const currencySymbol = parseCurrencySymbol(rawRecord.currency_symbol) ?? fallbackCurrencySymbol
  const formatted =
    typeof rawRecord.amount_formatted === 'string'
      ? rawRecord.amount_formatted
      : fallbackFormatted ?? null
  return {
    amount,
    currency,
    currencySymbol,
    formatted,
  }
}

function safeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function safeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lowered = value.toLowerCase()
    if (['true', '1', 'yes'].includes(lowered)) return true
    if (['false', '0', 'no'].includes(lowered)) return false
  }
  return null
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizePlan(raw: unknown): ClerkPlanNormalized | null {
  const rawRecord = asRecord(raw)
  const id = safeString(
    rawRecord?.id ??
      rawRecord?.plan_id ??
      rawRecord?.key ??
      rawRecord?.slug ??
      raw,
  )
  if (!id) return null

  const baseCurrency =
    parseCurrency(rawRecord?.currency) ??
    parseCurrency(asRecord(rawRecord?.fee)?.currency) ??
    parseCurrency(asRecord(rawRecord?.annual_fee)?.currency) ??
    null
  const baseSymbol =
    parseCurrencySymbol(rawRecord?.currency_symbol) ??
    parseCurrencySymbol(asRecord(rawRecord?.fee)?.currency_symbol) ??
    parseCurrencySymbol(asRecord(rawRecord?.annual_fee)?.currency_symbol) ??
    null

  const monthlyPrice = parseMoney(
    rawRecord?.amount,
    baseCurrency,
    baseSymbol,
    typeof rawRecord?.amount_formatted === 'string' ? rawRecord.amount_formatted : null,
  )
  const annualMonthlyPrice = parseMoney(
    rawRecord?.annual_monthly_amount,
    monthlyPrice?.currency ?? baseCurrency,
    monthlyPrice?.currencySymbol ?? baseSymbol,
    typeof rawRecord?.annual_monthly_amount_formatted === 'string'
      ? rawRecord.annual_monthly_amount_formatted
      : null,
  )
  const annualPrice = parseMoney(
    rawRecord?.annual_amount,
    monthlyPrice?.currency ?? baseCurrency,
    monthlyPrice?.currencySymbol ?? baseSymbol,
    typeof rawRecord?.annual_amount_formatted === 'string'
      ? rawRecord.annual_amount_formatted
      : null,
  )

  const setupFee = parseMoney(rawRecord?.fee, baseCurrency, baseSymbol)
  const annualMonthlySetupFee = parseMoney(rawRecord?.annual_monthly_fee, baseCurrency, baseSymbol)
  const annualSetupFee = parseMoney(rawRecord?.annual_fee, baseCurrency, baseSymbol)

  const currency = monthlyPrice?.currency ?? annualPrice?.currency ?? baseCurrency
  const currencySymbol =
    monthlyPrice?.currencySymbol ?? annualPrice?.currencySymbol ?? baseSymbol

  const featureItems = Array.isArray(rawRecord?.features) ? rawRecord.features : []
  const features: ClerkPlanFeature[] = featureItems.map((feature) => {
    const featureRecord = asRecord(feature)
    return {
      id: safeString(featureRecord?.id),
      name: safeString(featureRecord?.name),
      description: safeString(featureRecord?.description),
      slug: safeString(featureRecord?.slug),
      avatarUrl: safeString(featureRecord?.avatar_url),
    }
  })

  return {
    id,
    name: safeString(rawRecord?.name),
    description: safeString(rawRecord?.description),
    slug: safeString(rawRecord?.slug),
    productId: safeString(rawRecord?.product_id),
    currency,
    currencySymbol,
    period: safeString(rawRecord?.period),
    interval: safeNumber(rawRecord?.interval),
    isDefault: safeBoolean(rawRecord?.is_default),
    isRecurring: safeBoolean(rawRecord?.is_recurring),
    publiclyVisible: safeBoolean(rawRecord?.publicly_visible),
    hasBaseFee: safeBoolean(rawRecord?.has_base_fee),
    payerType: Array.isArray(rawRecord?.payer_type)
      ? rawRecord.payer_type.filter(
          (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0,
        )
      : [],
    forPayerType: safeString(rawRecord?.for_payer_type),
    avatarUrl: safeString(rawRecord?.avatar_url),
    freeTrialEnabled: safeBoolean(rawRecord?.free_trial_enabled),
    freeTrialDays: safeNumber(rawRecord?.free_trial_days),
    prices: {
      ...(monthlyPrice ? { month: monthlyPrice } : {}),
      ...(annualPrice ? { year: annualPrice } : {}),
      ...(annualMonthlyPrice ? { annualMonthly: annualMonthlyPrice } : {}),
      ...(setupFee ? { setupFee } : {}),
      ...(annualSetupFee ? { annualSetupFee } : {}),
      ...(annualMonthlySetupFee ? { annualMonthlySetupFee } : {}),
    },
    features,
  }
}

function extractPlanCollection(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }
  const payloadRecord = asRecord(payload)
  if (!payloadRecord) {
    return []
  }
  const keys = ['plans', 'data', 'items', 'products'] as const
  for (const key of keys) {
    const candidate = payloadRecord[key as string]
    if (Array.isArray(candidate)) {
      return candidate
    }
  }
  return []
}

export async function fetchCommercePlans(): Promise<ClerkPlanNormalized[]> {
  const token = process.env.CLERK_BILLING_API_KEY || process.env.CLERK_SECRET_KEY
  if (!token) {
    throw new Error('CLERK_SECRET_KEY not configured')
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const errors: Array<{ url: string; status?: number; message?: string }> = []

  for (const url of CLERK_PLAN_ENDPOINTS) {
    try {
      const response = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
      const text = await response.text()
      if (!response.ok) {
        errors.push({ url, status: response.status, message: text?.slice(0, 500) })
        continue
      }
      let payload: unknown = null
      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = null
      }

      const collection = extractPlanCollection(payload)
      const normalized = collection
        .map((item) => normalizePlan(item))
        .filter((plan): plan is ClerkPlanNormalized => Boolean(plan))

      if (normalized.length > 0) {
        return normalized
      }
      errors.push({ url, message: 'No plans found in response' })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push({ url, message })
    }
  }

  throw new Error(`Failed to fetch Clerk plans: ${JSON.stringify(errors)}`)
}
