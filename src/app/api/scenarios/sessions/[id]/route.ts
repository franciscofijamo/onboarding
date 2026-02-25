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

    const session = await db.workplaceScenarioSession.findFirst({
      where: { id, userId: user.id },
      include: {
        responses: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        scenarioType: session.scenarioType,
        totalQuestions: session.totalQuestions,
        answeredCount: session.answeredCount,
        analyzedCount: session.analyzedCount,
        averageScore: session.averageScore,
        createdAt: session.createdAt,
        responses: session.responses.map(r => ({
          id: r.id,
          questionIndex: r.questionIndex,
          question: r.prompt,
          audioUrl: r.audioUrl,
          duration: r.duration,
          transcript: r.transcript,
          status: r.status,
          score: r.score,
          feedback: r.feedback,
          createdAt: r.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching scenario session:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const session = await db.workplaceScenarioSession.findFirst({
      where: { id, userId: user.id },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    await db.workplaceScenarioSession.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting scenario session:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
