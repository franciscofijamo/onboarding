import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { runApplicationAnalysis } from '@/lib/job-application/analyze'

const CreateJobApplicationSchema = z.object({
  resumeId: z.string().optional(),
  coverLetterId: z.string().optional(),
  jobTitle: z.string().max(200).optional(),
  companyName: z.string().max(200).optional(),
  jobDescription: z.string().max(50000).optional().default(''),
  companyInfo: z.string().max(10000).optional(),
  triggerAnalysis: z.boolean().default(false),
  idempotencyKey: z.string().max(200).optional(),
})

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
    const parsed = CreateJobApplicationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      resumeId,
      coverLetterId,
      jobTitle,
      companyName,
      jobDescription,
      companyInfo,
      triggerAnalysis,
      idempotencyKey,
    } = parsed.data

    let resume = null
    if (resumeId) {
      resume = await db.resume.findFirst({ where: { id: resumeId, userId: user.id } })
      if (!resume) {
        return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
      }
    }

    let coverLetter = null
    if (coverLetterId) {
      coverLetter = await db.coverLetter.findFirst({ where: { id: coverLetterId, userId: user.id } })
      if (!coverLetter) {
        return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 })
      }
    }

    if (triggerAnalysis) {
      if (!jobDescription.trim()) {
        return NextResponse.json(
          { error: 'Job description is required when triggerAnalysis is true' },
          { status: 400 }
        )
      }
      if (!resume?.content?.trim()) {
        return NextResponse.json(
          { error: 'A saved resume with content is required before analysis' },
          { status: 400 }
        )
      }
    }

    const jobApplication = await db.jobApplication.create({
      data: {
        userId: user.id,
        resumeId: resume?.id,
        coverLetterId: coverLetter?.id,
        jobTitle,
        companyName,
        jobDescription,
        companyInfo,
        status: 'DRAFT',
      },
    })

    if (triggerAnalysis) {
      try {
        const analysis = await runApplicationAnalysis({
          clerkId,
          userId: user.id,
          jobApplicationId: jobApplication.id,
          idempotencyKey,
        })

        return NextResponse.json(
          {
            jobApplication: { ...jobApplication, status: 'ANALYZED' },
            analysis,
          },
          { status: 201 }
        )
      } catch (analysisError) {
        console.error('Analysis failed, saving application as draft:', analysisError)

        return NextResponse.json(
          {
            jobApplication: { ...jobApplication, status: 'DRAFT' },
            analysisError: 'Analysis failed. You can retry later.',
          },
          { status: 201 }
        )
      }
    }

    return NextResponse.json({ jobApplication }, { status: 201 })
  } catch (error) {
    console.error('Error creating job application:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
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

    const jobApplications = await db.jobApplication.findMany({
      where: { userId: user.id },
      include: {
        resume: { select: { id: true, title: true } },
        coverLetter: { select: { id: true, title: true } },
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ jobApplications })
  } catch (error) {
    console.error('Error fetching job applications:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
