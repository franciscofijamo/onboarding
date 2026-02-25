import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isAdmin } from '@/lib/admin-utils'

import { withApiLogging } from '@/lib/logging/api'

export const runtime = 'nodejs'

async function handlePlansRefresh() {
  const { userId } = await auth()
  if (!userId || !(await isAdmin(userId))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  return NextResponse.json({ message: 'Sync with Clerk is disabled. Please manage plans manually or via Asaas integration.' })
}

export const POST = withApiLogging(handlePlansRefresh, {
  method: 'POST',
  route: '/api/admin/plans/refresh-pricing',
  feature: 'admin_plans',
})
