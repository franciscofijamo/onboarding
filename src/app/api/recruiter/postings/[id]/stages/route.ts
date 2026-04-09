import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: postingId } = await params

    const recruiter = await db.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
    if (!recruiter || recruiter.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const posting = await db.jobPosting.findFirst({
      where: { id: postingId, company: { userId: recruiter.id } },
      select: { id: true },
    })
    if (!posting) return NextResponse.json({ error: 'Posting not found' }, { status: 404 })

    const stages = await db.recruitmentInterviewStage.findMany({
      where: { jobPostingId: postingId },
      orderBy: { createdAt: 'asc' },
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { sessions: true } },
      },
    })

    return NextResponse.json({ stages })
  } catch (err) {
    console.error('GET stages error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: postingId } = await params

    const recruiter = await db.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
    if (!recruiter || recruiter.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const posting = await db.jobPosting.findFirst({
      where: { id: postingId, company: { userId: recruiter.id } },
      select: { id: true },
    })
    if (!posting) return NextResponse.json({ error: 'Posting not found' }, { status: 404 })

    const body = await request.json()
    const { name, questionCount = 5, focusType = 'MIXED' } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Stage name is required' }, { status: 400 })
    }
    if (![5, 10].includes(Number(questionCount))) {
      return NextResponse.json({ error: 'questionCount must be 5 or 10' }, { status: 400 })
    }
    if (!['TECHNICAL', 'BEHAVIORAL', 'MIXED'].includes(focusType)) {
      return NextResponse.json({ error: 'Invalid focusType' }, { status: 400 })
    }

    const stage = await db.recruitmentInterviewStage.create({
      data: {
        jobPostingId: postingId,
        name: name.trim(),
        questionCount: Number(questionCount),
        focusType,
        status: 'DRAFT',
      },
    })

    return NextResponse.json({ stage }, { status: 201 })
  } catch (err) {
    console.error('POST stages error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
