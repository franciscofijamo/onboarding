import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, { status: 404 })
    }

    const body = await request.json()
    const { resumeText, jobDescription, analysis } = body

    if (!resumeText || !jobDescription || !analysis) {
      return NextResponse.json(
        { error: 'Missing required fields (resumeText, jobDescription, analysis)' },
        { status: 400 }
      )
    }

    // Wrap in transaction to ensure consistency
    const jobApp = await db.$transaction(async (tx) => {
      // 1. Create a dummy/text Resume record
      const resume = await tx.resume.create({
        data: {
          userId: user.id,
          title: 'Imported Resume',
          content: resumeText,
        },
      })

      // 2. Create the JobApplication
      const application = await tx.jobApplication.create({
        data: {
          userId: user.id,
          resumeId: resume.id,
          jobDescription,
          status: 'ANALYZED', // Already analyzed as guest
        },
      })

      // 3. Create the ApplicationAnalysis using the guest AI result
      await tx.applicationAnalysis.create({
        data: {
          jobApplicationId: application.id,
          fitScore: analysis.fitScore,
          summary: analysis.summary,
          skillsMatch: analysis.skillsMatch,
          missingSkills: analysis.missingSkills,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          recommendations: analysis.recommendations,
          keywordAnalysis: analysis.keywordAnalysis,
          agentSkill: "APPLICATION_OPTIMIZER",
          creditsUsed: 0, // Guest feature doesn't charge on import!
        },
      })

      // Also create a "completed" execution dummy log, to align with the core analyzer logic
      await tx.applicationAnalysisExecution.create({
        data: {
          jobApplicationId: application.id,
          userId: user.id,
          inputHash: "guest-import-" + Date.now(),
          status: "COMPLETED",
          creditsCharged: false,
          creditsRefunded: false,
        }
      })

      return application
    })

    return NextResponse.json({ success: true, jobApplicationId: jobApp.id })
  } catch (error) {
    console.error('Error importing guest job application:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
