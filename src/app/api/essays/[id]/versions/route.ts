import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export async function GET(
  _request: NextRequest,
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
      where: { id, userId: user.id },
    })

    if (!essay) {
      return NextResponse.json({ error: 'Essay not found' }, { status: 404 })
    }

    const versions = await db.essayVersion.findMany({
      where: { essayId: id },
      orderBy: { version: 'desc' },
      take: 10,
    })

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
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
      where: { id, userId: user.id },
    })

    if (!essay) {
      return NextResponse.json({ error: 'Essay not found' }, { status: 404 })
    }

    const lastVersion = await db.essayVersion.findFirst({
      where: { essayId: id },
      orderBy: { version: 'desc' },
    })

    const nextVersion = (lastVersion?.version ?? 0) + 1

    if (nextVersion > 10) {
      const oldest = await db.essayVersion.findFirst({
        where: { essayId: id },
        orderBy: { version: 'asc' },
      })
      if (oldest) {
        await db.essayVersion.delete({ where: { id: oldest.id } })
      }
    }

    const version = await db.essayVersion.create({
      data: {
        essayId: id,
        version: nextVersion,
        content: essay.content,
        wordCount: countWords(essay.content),
      },
    })

    return NextResponse.json({ version }, { status: 201 })
  } catch (error) {
    console.error('Error creating version:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
