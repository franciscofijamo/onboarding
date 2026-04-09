import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { z } from 'zod'

export const runtime = 'nodejs'

const ReorderSchema = z.object({
  orders: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().int().min(0),
      })
    )
    .min(1),
})

export async function PUT(
  request: NextRequest,
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
      select: { id: true, status: true },
    })
    if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

    if (stage.status === 'PUBLISHED') {
      return NextResponse.json({ error: 'Cannot reorder questions of a published stage' }, { status: 400 })
    }

    const body = await request.json()
    const validation = ReorderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.flatten() }, { status: 400 })
    }

    const { orders } = validation.data

    // Verify all question IDs belong to this stage before updating
    const questionIds = orders.map(o => o.id)
    const questions = await db.recruitmentInterviewQuestion.findMany({
      where: { id: { in: questionIds }, stageId },
      select: { id: true },
    })
    const validIds = new Set(questions.map(q => q.id))
    const invalidIds = questionIds.filter(id => !validIds.has(id))
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some question IDs do not belong to this stage', invalidIds },
        { status: 400 }
      )
    }

    // Update all orders in a single atomic transaction
    await db.$transaction(
      orders.map(({ id, order }) =>
        db.recruitmentInterviewQuestion.update({
          where: { id },
          data: { order },
        })
      )
    )

    const updatedQuestions = await db.recruitmentInterviewQuestion.findMany({
      where: { stageId },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ questions: updatedQuestions })
  } catch (err) {
    console.error('PUT reorder questions error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
