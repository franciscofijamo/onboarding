type PriceDisplayProps = {
  priceLabel: string
  billingSuffix?: string | null
  hasPrice: boolean
  description?: string
}

export function PriceDisplay({ priceLabel, billingSuffix, hasPrice }: PriceDisplayProps) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-bold text-zinc-900 tracking-tight">
          {priceLabel}
        </span>
        {hasPrice && billingSuffix && (
          <span className="text-base text-zinc-500 font-normal">/{billingSuffix}</span>
        )}
      </div>
    </div>
  )
}
