import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { runApplicationAnalysis } from '@/lib/job-application/analyze'
import { getPostHogClient } from '@/lib/posthog-server'

const CreateJobApplicationSchema = z.object({
  resumeId: z.string().optional(),
  coverLetterId: z.string().optional(),
  jobTitle: z.string().max(200).optional(),
  companyName: z.string().max(200).optional(),
  jobDescription: z.string().max(50000).optional().default(''),
  companyInfo: z.string().max(10000).optional(),
  triggerAnalysis: z.boolean().default(false),
  idempotencyKey: z.string().max(200).optional(),
  jobPostingId: z.string().optional(),
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
      jobPostingId,
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

    // Validate jobPostingId if provided
    let jobPosting = null
    if (jobPostingId) {
      jobPosting = await db.jobPosting.findFirst({
        where: { id: jobPostingId, status: 'PUBLISHED' },
        include: { company: { select: { name: true, location: true, description: true } } },
      })
      if (!jobPosting) {
        return NextResponse.json({ error: 'Job posting not found or not published' }, { status: 404 })
      }

      // Prevent duplicate applications to the same posting
      const duplicate = await db.jobApplication.findFirst({
        where: { userId: user.id, jobPostingId },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Já te candidataste a esta vaga', jobApplicationId: duplicate.id },
          { status: 409 }
        )
      }
    }

    if (triggerAnalysis && !jobPostingId) {
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

    const isPublicApplication = Boolean(jobPostingId)

    let jobApplication: Awaited<ReturnType<typeof db.jobApplication.create>>

    if (jobPosting && isPublicApplication) {
      // Transactional: create application + pipeline entry atomically
      const result = await db.$transaction(async (tx) => {
        const app = await tx.jobApplication.create({
          data: {
            userId: user.id,
            resumeId: resume?.id,
            coverLetterId: coverLetter?.id,
            jobTitle: jobPosting.title,
            companyName: jobPosting.company.name,
            jobDescription: jobPosting.description,
            companyInfo: jobPosting.company.description ?? null,
            status: 'APPLIED',
            jobPostingId: jobPosting.id,
            isPublicApplication: true,
          },
        })
        const entry = await tx.candidatePipelineEntry.create({
          data: {
            jobPostingId: jobPosting.id,
            userId: user.id,
            jobApplicationId: app.id,
            currentStage: 'RECEIVED',
          },
        })
        return { app, entry }
      })
      jobApplication = result.app
    } else {
      jobApplication = await db.jobApplication.create({
        data: {
          userId: user.id,
          resumeId: resume?.id,
          coverLetterId: coverLetter?.id,
          jobTitle,
          companyName,
          jobDescription,
          companyInfo,
          status: 'DRAFT',
          jobPostingId: null,
          isPublicApplication: false,
        },
      })
    }

    // For platform applications: trigger background AI analysis
    if (jobPosting && isPublicApplication) {

      // Fire-and-forget background analysis (does NOT block response)
      if (resume?.content?.trim()) {
        const analysisKey = `platform-${jobApplication.id}-${Date.now()}`
        runApplicationAnalysis({
          clerkId,
          userId: user.id,
          jobApplicationId: jobApplication.id,
          idempotencyKey: analysisKey,
        })
          .then(async (analysis) => {
            if (analysis?.fitScore != null) {
              await db.candidatePipelineEntry.updateMany({
                where: { jobApplicationId: jobApplication.id },
                data: { fitScore: analysis.fitScore },
              })
            }
          })
          .catch((err) => {
            console.error('[Background analysis] Failed for application', jobApplication.id, err)
          })
      }

      const posthogPlatform = getPostHogClient()
      posthogPlatform.capture({
        distinctId: clerkId,
        event: 'job_application_created',
        properties: {
          job_title: jobPosting.title,
          company_name: jobPosting.company.name,
          is_public_application: true,
          job_posting_id: jobPosting.id,
        },
      })

      return NextResponse.json({ jobApplication }, { status: 201 })
    }

    const posthog = getPostHogClient()
    posthog.capture({
      distinctId: clerkId,
      event: 'job_application_created',
      properties: {
        job_title: jobTitle || null,
        company_name: companyName || null,
        is_public_application: false,
        has_resume: Boolean(resumeId),
        has_cover_letter: Boolean(coverLetterId),
        trigger_analysis: triggerAnalysis,
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
        jobPosting: {
          select: { id: true, title: true, company: { select: { name: true } } },
        },
        pipelineEntry: {
          select: { id: true, currentStage: true, fitScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Strip AI analysis data from public/platform applications — visible to recruiters only
    const sanitized = jobApplications.map((app) => {
      if (app.isPublicApplication) {
        return {
          ...app,
          analyses: [],
          // Expose only pipeline stage (not fitScore) to candidates
          pipelineEntry: app.pipelineEntry
            ? { currentStage: app.pipelineEntry.currentStage }
            : null,
        }
      }
      return app
    })

    return NextResponse.json({ jobApplications: sanitized })
  } catch (error) {
    console.error('Error fetching job applications:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
