"use client"

import { cn } from '@/lib/utils'

type BillingPeriod = 'monthly' | 'yearly'

type BillingPeriodToggleProps = {
  value: BillingPeriod
  onChange: (period: BillingPeriod) => void
  className?: string
}

export function BillingPeriodToggle({ value, onChange, className }: BillingPeriodToggleProps) {
  return (
    <div className={cn(
      "inline-flex items-center p-1.5 rounded-full border border-white dark:border-zinc-600/50 shadow-none text-black dark:text-zinc-200",
      "bg-white/90 dark:bg-zinc-800/40",
      className
    )}>
      {(['monthly', 'yearly'] as const).map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => onChange(period)}
          className={cn(
            'px-8 py-2.5 text-sm font-medium rounded-full transition-all duration-300 capitalize',
            period === value
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md'
              : 'text-black dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-zinc-100'
          )}
        >
          {period === 'yearly' ? 'Anual' : 'Mensal'}
        </button>
      ))}
    </div>
  )
}
