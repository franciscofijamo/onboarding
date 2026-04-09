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
    if (jobApplication.isPublicApplication) {
      return NextResponse.json({
        jobApplication: {
          id: jobApplication.id,
          jobTitle: jobApplication.jobTitle,
          companyName: jobApplication.companyName,
          status: jobApplication.status,
          createdAt: jobApplication.createdAt,
          resume: jobApplication.resume,
          coverLetter: jobApplication.coverLetter,
        },
        analysis: null,
        allAnalyses: [],
      })
    }

    const latestAnalysis = jobApplication.analyses[0] || null

    return NextResponse.json({
      jobApplication: {
        id: jobApplication.id,
        jobTitle: jobApplication.jobTitle,
        companyName: jobApplication.companyName,
        jobDescription: jobApplication.jobDescription,
        companyInfo: jobApplication.companyInfo,
        status: jobApplication.status,
        createdAt: jobApplication.createdAt,
        resume: jobApplication.resume,
        coverLetter: jobApplication.coverLetter,
      },
      analysis: latestAnalysis,
      allAnalyses: jobApplication.analyses,
    })
  } catch (error) {
    console.error('Error fetching analysis:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
