import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/admin-utils'
import { fetchCommercePlans } from '@/lib/clerk/commerce-plans'
import { withApiLogging } from '@/lib/logging/api'

async function handleAdminClerkPlans() {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const plans = await fetchCommercePlans()
    return NextResponse.json({ plans })
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to fetch Clerk plans'
    const lower = message.toLowerCase()
    const status = lower.includes('not configured') ? 501 : 502
    return NextResponse.json({ error: message }, { status })
  }
}

export const GET = withApiLogging(handleAdminClerkPlans, {
  method: 'GET',
  route: '/api/admin/clerk/plans',
  feature: 'admin_plans',
})
