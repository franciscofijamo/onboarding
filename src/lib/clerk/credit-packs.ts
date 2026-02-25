// Map Clerk price IDs to the number of credits to add
// Fill these with your actual Clerk Price IDs for credit packs
// Example:
// export const CREDIT_PACK_PRICE_TO_CREDITS: Record<string, number> = {
//   'cplan_xxx': 100, // Small pack: 100 credits
//   'cplan_yyy': 500, // Medium pack: 500 credits
//   'cplan_zzz': 2000, // Large pack: 2000 credits
// }

export const CREDIT_PACK_PRICE_TO_CREDITS: Record<string, number> = {
  free_user: 10,
  'cplan_314Vj2ZCkw6PEDUBq4jq5MKz3Ht': 100,
}

export function getCreditsForPrice(priceId: string | undefined | null): number | null {
  if (!priceId) return null
  const credits = CREDIT_PACK_PRICE_TO_CREDITS[priceId]
  return Number.isFinite(credits) ? credits : null
}

