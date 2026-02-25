import { NextResponse } from 'next/server'
import { getEffectiveFeatureCosts, getEffectivePlanCredits } from '@/lib/credits/settings'
import { withApiLogging } from '@/lib/logging/api'

async function handleGetSettings() {
  const featureCosts = await getEffectiveFeatureCosts()
  const planCredits = await getEffectivePlanCredits()
  return NextResponse.json({ featureCosts, planCredits })
}

export const GET = withApiLogging(handleGetSettings, {
  method: 'GET',
  route: '/api/credits/settings',
  feature: 'credits',
})
