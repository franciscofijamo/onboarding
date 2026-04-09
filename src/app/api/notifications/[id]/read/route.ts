import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findUnique({ where: { clerkId }, select: { id: true } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { id } = await params

    const notification = await db.inAppNotification.findFirst({
      where: { id, userId: user.id },
    })
    if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 })

    await db.inAppNotification.update({ where: { id }, data: { read: true } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Mark read error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
