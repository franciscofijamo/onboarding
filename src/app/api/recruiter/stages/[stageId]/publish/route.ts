import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ stageId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { stageId } = await params

    const recruiter = await db.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
    if (!recruiter || recruiter.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stage = await db.recruitmentInterviewStage.findFirst({
      where: { id: stageId, jobPosting: { company: { userId: recruiter.id } } },
      include: { questions: true },
    })
    if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

    if (stage.status === 'PUBLISHED') {
      return NextResponse.json({ error: 'Stage is already published' }, { status: 400 })
    }

    if (stage.questions.length === 0) {
      return NextResponse.json({ error: 'Cannot publish a stage with no questions' }, { status: 400 })
    }

    const updated = await db.recruitmentInterviewStage.update({
      where: { id: stageId },
      data: { status: 'PUBLISHED' },
      include: { questions: { orderBy: { order: 'asc' } } },
    })

    return NextResponse.json({ stage: updated })
  } catch (err) {
    console.error('Publish stage error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
