import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: postingId, userId: candidateId } = await params

    const recruiter = await db.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
    if (!recruiter || recruiter.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const posting = await db.jobPosting.findFirst({
      where: { id: postingId, company: { userId: recruiter.id } },
      select: { id: true },
    })
    if (!posting) return NextResponse.json({ error: 'Posting not found' }, { status: 404 })

    // Verify candidate has an application for this posting
    const entry = await db.candidatePipelineEntry.findFirst({
      where: { jobPostingId: postingId, userId: candidateId },
      select: { id: true },
    })
    if (!entry) return NextResponse.json({ error: 'Candidate not in pipeline' }, { status: 404 })

    // Get sessions that are linked to recruitment stages for this posting
    const sessions = await db.workplaceScenarioSession.findMany({
      where: {
        userId: candidateId,
        recruitmentStage: { jobPostingId: postingId },
      },
      include: {
        recruitmentStage: {
          select: { id: true, name: true, focusType: true },
        },
        responses: {
          orderBy: { questionIndex: 'asc' },
          select: {
            id: true,
            questionIndex: true,
            prompt: true,
            status: true,
            score: true,
            transcript: true,
            feedback: true,
            duration: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ sessions })
  } catch (err) {
    console.error('GET candidate sessions error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
