import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Feature = {
  name: string
  description?: string
  included: boolean
}

type FeatureListProps = {
  features: Feature[]
  className?: string
}

export function FeatureList({ features, className }: FeatureListProps) {
  if (features.length === 0) {
    return null
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {features.map((feature) => (
        <li key={feature.name} className="flex items-start gap-3">
          <Check
            className={cn(
              'w-5 h-5 shrink-0 mt-0.5',
              feature.included
                ? 'text-emerald-600'
                : 'text-zinc-300'
            )}
            strokeWidth={2}
          />
          <span className="text-sm text-zinc-700 leading-snug">
            {feature.name}
          </span>
        </li>
      ))}
    </ul>
  )
}
