import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { EssayType, EssayStatus, FulbrightCategory } from '../../../../../prisma/generated/client'

const FULBRIGHT_TYPES = ['GRANT_PURPOSE', 'PERSONAL_STATEMENT'] as const
const FULBRIGHT_CATEGORIES = ['STUDENT', 'YOUNG_PROFESSIONAL', 'RESEARCHER'] as const

const CreateEssaySchema = z.object({
  type: z.enum(FULBRIGHT_TYPES),
  content: z.string().min(0).max(20000),
  title: z.string().max(200).optional(),
  fulbrightCategory: z.enum(FULBRIGHT_CATEGORIES).optional(),
  hostInstitution: z.string().max(300).optional(),
})

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const essays = await db.essay.findMany({
      where: {
        userId: user.id,
        type: { in: [EssayType.GRANT_PURPOSE, EssayType.PERSONAL_STATEMENT] },
        scholarship: 'fulbright',
      },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, score: true, createdAt: true },
        },
      },
      orderBy: { type: 'asc' },
    })

    const essayMap: Record<string, typeof essays[0] | null> = {}
    for (const t of FULBRIGHT_TYPES) {
      essayMap[t] = essays.find(e => e.type === t) || null
    }

    return NextResponse.json({ essays: essayMap })
  } catch (error) {
    console.error('Error fetching Fulbright essays:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = CreateEssaySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
    }

    const { type, content, title, fulbrightCategory, hostInstitution } = parsed.data
    const wordCount = countWords(content)

    const existing = await db.essay.findUnique({
      where: { userId_type: { userId: user.id, type: type as EssayType } },
    })

    if (existing) {
      const updated = await db.essay.update({
        where: { id: existing.id },
        data: {
          content,
          wordCount,
          title,
          scholarship: 'fulbright',
          fulbrightCategory: fulbrightCategory as FulbrightCategory | undefined,
          hostInstitution,
          status: existing.status === EssayStatus.FINALIZED ? EssayStatus.FINALIZED : EssayStatus.DRAFT,
        },
      })
      return NextResponse.json({ essay: updated })
    }

    const essay = await db.essay.create({
      data: {
        userId: user.id,
        type: type as EssayType,
        content,
        wordCount,
        title,
        scholarship: 'fulbright',
        fulbrightCategory: fulbrightCategory as FulbrightCategory | undefined,
        hostInstitution,
        status: EssayStatus.DRAFT,
      },
    })

    return NextResponse.json({ essay }, { status: 201 })
  } catch (error) {
    console.error('Error creating/updating Fulbright essay:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
