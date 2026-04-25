"use client"

import { useState } from 'react'
import { PlanDisplay, PlanPricingSection, buildPlanTiers } from '@/components/plans'
import { Button } from '@/components/ui/button'
import { CpfModal, BillingType } from '@/components/billing/cpf-modal'
import { MpesaModal } from '@/components/billing/mpesa-modal'
import { cn } from '@/lib/utils'
import { postCheckoutWithTimeout } from '@/lib/billing/mpesa-feedback'

type PlanGridProps = {
  plans: PlanDisplay[]
  currentPlanId?: string
}

type PendingCheckout = {
  planId: string
  period: 'MONTHLY' | 'YEARLY'
}

export function PlanGrid({ plans, currentPlanId }: PlanGridProps) {
  const tiers = buildPlanTiers(plans)
  const [cpfModalOpen, setCpfModalOpen] = useState(false)
  const [mpesaModalOpen, setMpesaModalOpen] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (!tiers.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No active plans available at the moment.
      </div>
    )
  }

  return (
    <>
    <PlanPricingSection
      layout="compact"
      tiers={tiers}
      title=""
      subtitle=""
      renderAction={({ tier, billingPeriod, resolvedPeriod, defaultButtonClassName, cta }) => {
        const isCurrentPlan = currentPlanId === tier.plan.id
        
        if (isCurrentPlan) {
          return (
            <Button disabled className={cn('w-full', defaultButtonClassName, 'bg-green-600 hover:bg-green-600')}>
              Plano Atual
            </Button>
          )
        }

        if (cta.type === 'contact') {
          if (!cta.url) {
            return (
              <Button disabled className={cn('w-full', defaultButtonClassName)}>
                {cta.label}
              </Button>
            )
          }
          const isExternal = /^https?:/i.test(cta.url)
          return (
            <Button asChild className={cn('w-full relative transition-all duration-300', defaultButtonClassName)}>
              <a
                href={cta.url}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer' : undefined}
                className="relative z-10 flex items-center justify-center gap-2"
              >
                {cta.label}
              </a>
            </Button>
          )
        }

        const effectivePeriod = resolvedPeriod ?? null
        const hasPrice = effectivePeriod === 'yearly'
          ? tier.plan.priceYearlyCents != null
          : effectivePeriod === 'monthly'
            ? tier.plan.priceMonthlyCents != null
            : false

        if (!hasPrice || !effectivePeriod) {
          return (
            <Button disabled className={cn('w-full', defaultButtonClassName)}>
              {cta.label}
            </Button>
          )
        }

        const periodLabel = effectivePeriod === 'yearly' ? 'yearly' : 'monthly'
        const toggledDifferent = billingPeriod !== effectivePeriod
        const buttonLabel = toggledDifferent
          ? `${cta.label} (${periodLabel} available)`
          : `${cta.label} (${periodLabel})`

        const handleSubscribe = () => {
          const period = effectivePeriod === 'yearly' ? 'YEARLY' : 'MONTHLY'
          setPendingCheckout({ planId: tier.plan.id, period })
          const isMpesa = (tier.plan.currency || '').toLowerCase() === 'mzn'
          if (isMpesa) {
            setMpesaModalOpen(true)
          } else {
            setCpfModalOpen(true)
          }
        }

        return (
          <Button
            onClick={handleSubscribe}
            className={cn('w-full relative transition-all duration-300', defaultButtonClassName)}
          >
            {buttonLabel}
          </Button>
        )
      }}
    />

    <CpfModal
      open={cpfModalOpen}
      onOpenChange={setCpfModalOpen}
      isLoading={isLoading}
      onConfirm={async (cpfCnpj, billingType) => {
        if (!pendingCheckout) return

        setIsLoading(true)
        try {
          const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planId: pendingCheckout.planId,
              period: pendingCheckout.period,
              cpfCnpj,
              billingType,
            }),
          })

          const data = await response.json()

          if (data.url) {
            window.location.href = data.url
          } else if (data.success) {
            window.location.reload()
          } else {
            console.error('Checkout failed:', data.error)
          }
        } catch (error) {
          console.error('Checkout error:', error)
        } finally {
          setIsLoading(false)
          setCpfModalOpen(false)
          setPendingCheckout(null)
        }
      }}
    />

    <MpesaModal
      open={mpesaModalOpen}
      onOpenChange={setMpesaModalOpen}
      isLoading={isLoading}
      onConfirm={async (msisdn) => {
        if (!pendingCheckout) return

        setIsLoading(true)
        try {
          const { response, data } = await postCheckoutWithTimeout({
            planId: pendingCheckout.planId,
            period: pendingCheckout.period,
            phoneNumber: msisdn,
          })

          if (data.url) {
            window.location.href = data.url
          } else if (data.success) {
            window.location.reload()
          } else {
            console.error('Checkout failed:', data.error)
          }
        } catch (error) {
          console.error('Checkout error:', error)
        } finally {
          setIsLoading(false)
          setMpesaModalOpen(false)
          setPendingCheckout(null)
        }
      }}
    />
  </>
  )
}
