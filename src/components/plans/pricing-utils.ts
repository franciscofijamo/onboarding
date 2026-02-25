import { cn } from '@/lib/utils'

export type BillingPeriod = 'monthly' | 'yearly'

export const buttonStyles = {
  default: cn(
    'h-12 rounded-full',
    'bg-lime-200 hover:bg-lime-300',
    'text-zinc-900',
    'border-0',
    'text-sm font-semibold'
  ),
  highlight: cn(
    'h-12 rounded-full',
    'bg-zinc-900 hover:bg-zinc-800',
    'text-white',
    'border-0',
    'text-sm font-semibold'
  )
}

export const badgeStyles = cn(
  'px-2.5 py-0.5 text-xs font-medium rounded-md',
  'bg-lime-100 text-zinc-800',
  'border-none shadow-none'
)

export function formatCurrency(amountCents: number, currency?: string | null) {
  if (Number.isNaN(amountCents)) {
    return '-'
  }
  const normalizedCurrency = (currency || 'USD').toUpperCase()
  return (amountCents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: normalizedCurrency
  })
}

export function resolvePricing(
  plan: { priceMonthlyCents?: number | null; priceYearlyCents?: number | null; currency?: string | null },
  selectedPeriod: BillingPeriod
) {
  const selectedPrice = selectedPeriod === 'yearly' ? plan.priceYearlyCents : plan.priceMonthlyCents
  const hasSelectedPrice = typeof selectedPrice === 'number' && selectedPrice != null

  const fallbackPeriod: BillingPeriod | null = plan.priceMonthlyCents != null
    ? 'monthly'
    : plan.priceYearlyCents != null
      ? 'yearly'
      : null

  const resolvedPeriod = hasSelectedPrice ? selectedPeriod : fallbackPeriod

  const priceCents = resolvedPeriod === 'yearly'
    ? plan.priceYearlyCents
    : resolvedPeriod === 'monthly'
      ? plan.priceMonthlyCents
      : null

  const hasPrice = typeof priceCents === 'number' && priceCents != null
  const priceLabel = hasPrice ? formatCurrency(priceCents!, plan.currency) : 'Contact us'
  const billingSuffix = hasPrice ? (resolvedPeriod === 'yearly' ? 'year' : 'month') : null

  return {
    resolvedPeriod,
    priceCents,
    hasPrice,
    priceLabel,
    billingSuffix
  }
}
