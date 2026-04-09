import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ stageId: string; questionId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { stageId, questionId } = await params

    const recruiter = await db.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
    if (!recruiter || recruiter.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stage = await db.recruitmentInterviewStage.findFirst({
      where: { id: stageId, jobPosting: { company: { userId: recruiter.id } } },
      select: { id: true, status: true },
    })
    if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

    if (stage.status === 'PUBLISHED') {
      return NextResponse.json({ error: 'Cannot edit questions of a published stage' }, { status: 400 })
    }

    const question = await db.recruitmentInterviewQuestion.findFirst({
      where: { id: questionId, stageId },
    })
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const body = await request.json()
    const { prompt, questionType, order } = body

    if (prompt !== undefined && (typeof prompt !== 'string' || !prompt.trim())) {
      return NextResponse.json({ error: 'prompt must be a non-empty string' }, { status: 400 })
    }

    const updated = await db.recruitmentInterviewQuestion.update({
      where: { id: questionId },
      data: {
        ...(prompt !== undefined ? { prompt: prompt.trim(), isEdited: true } : {}),
        ...(questionType !== undefined ? { questionType } : {}),
        ...(order !== undefined ? { order: Number(order) } : {}),
      },
    })

    return NextResponse.json({ question: updated })
  } catch (err) {
    console.error('PUT question error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ stageId: string; questionId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { stageId, questionId } = await params

    const recruiter = await db.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
    if (!recruiter || recruiter.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stage = await db.recruitmentInterviewStage.findFirst({
      where: { id: stageId, jobPosting: { company: { userId: recruiter.id } } },
      select: { id: true, status: true },
    })
    if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

    if (stage.status === 'PUBLISHED') {
      return NextResponse.json({ error: 'Cannot delete questions of a published stage' }, { status: 400 })
    }

    // Bind stageId to prevent cross-stage deletion (authorization guard)
    const toDelete = await db.recruitmentInterviewQuestion.findFirst({
      where: { id: questionId, stageId },
    })
    if (!toDelete) return NextResponse.json({ error: 'Question not found in this stage' }, { status: 404 })

    await db.recruitmentInterviewQuestion.delete({ where: { id: questionId } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE question error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
