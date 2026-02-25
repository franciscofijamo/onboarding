import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await db.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const essay = await db.essay.findFirst({
      where: { id, userId: user.id, scholarship: 'fulbright' },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 10,
        },
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!essay) {
      return NextResponse.json({ error: 'Essay not found' }, { status: 404 })
    }

    return NextResponse.json({ essay })
  } catch (error) {
    console.error('Error fetching Fulbright essay detail:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
