"use client"

import { ArrowRight } from 'lucide-react'
import { PlanDisplay, PlanPricingSection, buildPlanTiers } from '@/components/plans'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PricingProps = {
  plans: PlanDisplay[]
}

export function Pricing({ plans }: PricingProps) {
  const tiers = buildPlanTiers(plans)

  if (!tiers.length) {
    return (
      <section id="pricing" className="container mx-auto px-4 mt-24">
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum plano ativo disponível no momento.
        </div>
      </section>
    )
  }

  return (
    <div id="pricing">
      <PlanPricingSection
        className="mt-24"
        tiers={tiers}
        title="Planos para acompanhar seu crescimento"
        subtitle="Escolha a cobrança mensal ou anual e desbloqueie recursos avançados conforme sua evolução."
        renderAction={({ tier, cta, defaultButtonClassName }) => {
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
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
            )
          }

          const planIdentifier = tier.plan.id // Use internal ID for mapping

          const handleSubscribe = async () => {
            try {
              const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: planIdentifier }),
              });

              const data = await response.json();
              if (data.url) {
                window.location.href = data.url;
              } else if (data.success) {
                // Handle free plan or direct success
                window.location.reload();
              } else {
                console.error('Checkout failed:', data.error);
                // You might want to show a toast here
              }
            } catch (error) {
              console.error('Checkout error:', error);
            }
          };

          return (
            <Button
              onClick={handleSubscribe}
              className={cn('w-full relative transition-all duration-300', defaultButtonClassName)}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {cta.label}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          )
        }}
      />
    </div>
  )
}
