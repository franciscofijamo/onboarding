import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { AnalysisInProgressError, runApplicationAnalysis } from '@/lib/job-application/analyze'

export async function POST(
  request: Request,
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

    const existing = await db.jobApplication.findFirst({
      where: { id, userId: user.id },
      select: { id: true, isPublicApplication: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Job application not found' }, { status: 404 })
    }

    // Analysis for public/platform applications is reserved for recruiters only
    if (existing.isPublicApplication) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let idempotencyKey: string | undefined
    try {
      const body = await request.json()
      if (body && typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()) {
        idempotencyKey = body.idempotencyKey.trim()
      }
    } catch {
      idempotencyKey = undefined
    }

    try {
      const analysis = await runApplicationAnalysis({
        clerkId,
        userId: user.id,
        jobApplicationId: id,
        idempotencyKey,
      })

      return NextResponse.json({
        jobApplication: { id, status: 'ANALYZED' },
        analysis,
      })
    } catch (analysisError) {
      if (analysisError instanceof AnalysisInProgressError) {
        return NextResponse.json(
          { error: 'Analysis already in progress for this application.' },
          { status: 409 }
        )
      }

      console.error('Error analyzing job application:', analysisError)
      return NextResponse.json(
        {
          error:
            analysisError instanceof Error
              ? analysisError.message
              : 'Analysis failed. You can retry later.',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error analyzing job application:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
