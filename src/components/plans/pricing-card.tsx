import { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PlanTierView } from './plan-tier-config'
import { PriceDisplay } from './price-display'
import { FeatureList } from './feature-list'
import { CTAButton, CTAAction } from './cta-button'
import { buttonStyles, resolvePricing, type BillingPeriod } from './pricing-utils'

type PricingCardProps = {
  tier: PlanTierView
  billingPeriod: BillingPeriod
  renderAction?: (args: {
    tier: PlanTierView
    billingPeriod: BillingPeriod
    resolvedPeriod: BillingPeriod | null
    highlight: boolean
    defaultButtonClassName: string
    cta: PlanTierView['cta']
  }) => ReactNode
}

export function PricingCard({ tier, billingPeriod, renderAction }: PricingCardProps) {
  const { resolvedPeriod, hasPrice, priceLabel, billingSuffix } = resolvePricing(tier.plan, billingPeriod)
  const isFeatured = Boolean(tier.highlight)
  const buttonClass = isFeatured ? buttonStyles.highlight : buttonStyles.default

  return (
    <div
      className={cn(
        'relative bg-white',
        'rounded-2xl',
        'flex flex-col h-full',
        'border border-zinc-200 shadow-sm',
        'hover:shadow-md transition-shadow duration-200',
      )}
    >
      <div className="p-8 pb-0 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-xl font-semibold text-zinc-900">
            {tier.plan.name}
          </h3>
          {tier.badge && (
            <Badge className="bg-lime-100 text-zinc-800 border-0 text-xs font-medium px-2.5 py-0.5 rounded-md">
              {tier.badge}
            </Badge>
          )}
        </div>

        <PriceDisplay
          priceLabel={priceLabel}
          billingSuffix={billingSuffix}
          hasPrice={hasPrice}
          description={tier.description}
        />

        <div className="mb-6">
          {renderAction ? (
            renderAction({
              tier,
              billingPeriod,
              resolvedPeriod,
              highlight: isFeatured,
              defaultButtonClassName: buttonClass,
              cta: tier.cta
            })
          ) : (
            <CTAButton cta={tier.cta as CTAAction} className={buttonClass} isFeatured={isFeatured} />
          )}
        </div>

        {tier.features.length > 0 && (
          <div className="pt-6 border-t border-zinc-100 flex-1">
            <p className="text-sm font-medium text-zinc-700 mb-4">
              {tier.description ? tier.description.split('.')[0] + ':' : 'Funcionalidades:'}
            </p>
            <FeatureList features={tier.features} />
          </div>
        )}
      </div>

      <div className="p-8 pt-4" />
    </div>
  )
}
