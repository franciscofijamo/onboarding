import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const UpdateJobApplicationSchema = z
  .object({
    resumeId: z.string().nullable().optional(),
    coverLetterId: z.string().nullable().optional(),
    jobTitle: z.string().max(200).nullable().optional(),
    companyName: z.string().max(200).nullable().optional(),
    jobDescription: z.string().max(50000).optional(),
    companyInfo: z.string().max(10000).nullable().optional(),
    status: z
      .enum(['DRAFT', 'ANALYZING', 'ANALYZED', 'APPLIED', 'INTERVIEWING', 'OFFERED', 'REJECTED', 'ACCEPTED'])
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  })

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

    const jobApplication = await db.jobApplication.findFirst({
      where: { id, userId: user.id },
      include: {
        resume: { select: { id: true, title: true, content: true } },
        coverLetter: { select: { id: true, title: true, content: true } },
        analyses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!jobApplication) {
      return NextResponse.json({ error: 'Job application not found' }, { status: 404 })
    }

    // Analysis results for platform/public applications are recruiter-only
    const analysisPayload = jobApplication.isPublicApplication
      ? { analysis: null, allAnalyses: [] }
      : { analysis: jobApplication.analyses[0] ?? null, allAnalyses: jobApplication.analyses }

    return NextResponse.json({
      jobApplication: {
        id: jobApplication.id,
        jobTitle: jobApplication.jobTitle,
        companyName: jobApplication.companyName,
        jobDescription: jobApplication.isPublicApplication ? null : jobApplication.jobDescription,
        companyInfo: jobApplication.isPublicApplication ? null : jobApplication.companyInfo,
        status: jobApplication.status,
        createdAt: jobApplication.createdAt,
        updatedAt: jobApplication.updatedAt,
        resume: jobApplication.resume,
        coverLetter: jobApplication.coverLetter,
      },
      ...analysisPayload,
    })
  } catch (error) {
    console.error('Error fetching job application:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
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

    const existing = await db.jobApplication.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Job application not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = UpdateJobApplicationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (data.resumeId !== undefined && data.resumeId !== null) {
      const resume = await db.resume.findFirst({
        where: { id: data.resumeId, userId: user.id },
        select: { id: true },
      })
      if (!resume) {
        return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
      }
    }

    if (data.coverLetterId !== undefined && data.coverLetterId !== null) {
      const coverLetter = await db.coverLetter.findFirst({
        where: { id: data.coverLetterId, userId: user.id },
        select: { id: true },
      })
      if (!coverLetter) {
        return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 })
      }
    }

    const updated = await db.jobApplication.update({
      where: { id },
      data: {
        ...(data.resumeId !== undefined && { resumeId: data.resumeId }),
        ...(data.coverLetterId !== undefined && { coverLetterId: data.coverLetterId }),
        ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.jobDescription !== undefined && { jobDescription: data.jobDescription }),
        ...(data.companyInfo !== undefined && { companyInfo: data.companyInfo }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        resume: { select: { id: true, title: true } },
        coverLetter: { select: { id: true, title: true } },
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({ jobApplication: updated })
  } catch (error) {
    console.error('Error updating job application:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
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

    const existing = await db.jobApplication.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Job application not found' }, { status: 404 })
    }

    await db.jobApplication.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job application:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
