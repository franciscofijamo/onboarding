import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdateEssaySchema = z.object({
  content: z.string().min(0).max(10000).optional(),
  title: z.string().max(200).optional(),
})

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
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 10,
        },
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            versionNumber: true,
            score: true,
            status: true,
            feedback: true,
            wordCount: true,
            creditsUsed: true,
            createdAt: true,
          },
        },
      },
    })

    if (!essay) {
      return NextResponse.json({ error: 'Essay not found' }, { status: 404 })
    }

    return NextResponse.json({ essay })
  } catch (error) {
    console.error('Error fetching essay:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
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

    const body = await request.json()
    const parsed = UpdateEssaySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.content !== undefined) {
      updateData.content = parsed.data.content
      updateData.wordCount = countWords(parsed.data.content)
    }
    if (parsed.data.title !== undefined) {
      updateData.title = parsed.data.title
    }

    const updated = await db.essay.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ essay: updated })
  } catch (error) {
    console.error('Error updating essay:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
