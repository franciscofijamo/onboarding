import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { deductCreditsForFeature } from '@/lib/credits/deduct'
import { routeToSkill } from '@/lib/agents/orchestrator'
import { AgentSkill } from '@/lib/agents/types'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const CreateJobApplicationSchema = z.object({
  resumeId: z.string().optional(),
  coverLetterId: z.string().optional(),
  jobTitle: z.string().max(200).optional(),
  companyName: z.string().max(200).optional(),
  jobDescription: z.string().min(1).max(50000),
  companyInfo: z.string().max(10000).optional(),
  triggerAnalysis: z.boolean().default(true),
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
      return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
    }

    const { resumeId, coverLetterId, jobTitle, companyName, jobDescription, companyInfo, triggerAnalysis } = parsed.data

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

    const jobApplication = await db.jobApplication.create({
      data: {
        userId: user.id,
        resumeId: resume?.id,
        coverLetterId: coverLetter?.id,
        jobTitle,
        companyName,
        jobDescription,
        companyInfo,
        status: triggerAnalysis ? 'ANALYZING' : 'DRAFT',
      },
    })

    if (triggerAnalysis && resume?.content) {
      try {
        await deductCreditsForFeature({
          clerkUserId: clerkId,
          feature: 'cv_analysis',
          details: { jobApplicationId: jobApplication.id },
        })

        const userContext = {
          resumeText: resume.content || undefined,
          coverLetterText: coverLetter?.content || undefined,
          jobDescriptionText: jobDescription,
          targetRole: jobTitle || undefined,
          targetCompany: companyName || undefined,
          careerPath: user.careerPath || undefined,
          industry: user.industry || undefined,
        }

        const { skill, systemMessage, userPrompt } = await routeToSkill(
          'Analyze my resume against this job description. Provide a detailed match analysis with fit score, matching skills, missing skills, strengths, and improvement recommendations.',
          userContext,
          { skill: AgentSkill.APPLICATION_OPTIMIZER }
        )

        const model = PROVIDER(process.env.AI_MODEL || 'google/gemini-2.0-flash-001')

        const { text: analysisContent } = await generateText({
          model,
          system: systemMessage,
          prompt: userPrompt + '\n\nRespond ONLY with valid JSON. No markdown, no code fences, no explanations outside the JSON.',
          temperature: 0.7,
        })

        let analysisResult: Record<string, unknown> = {}
        try {
          let cleaned = analysisContent.trim()
          cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```$/i, '').trim()
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            analysisResult = JSON.parse(jsonMatch[0])
          } else {
            analysisResult = JSON.parse(cleaned)
          }
        } catch {
          console.error('Failed to parse AI response as JSON, raw:', analysisContent.slice(0, 500))
          analysisResult = {}
        }

        const toJsonArray = (val: unknown): string[] | null => {
          if (Array.isArray(val) && val.length > 0) return val.map(String)
          return null
        }

        const analysis = await db.applicationAnalysis.create({
          data: {
            jobApplicationId: jobApplication.id,
            fitScore: typeof analysisResult.fitScore === 'number' ? analysisResult.fitScore : (typeof analysisResult.fitScore === 'string' ? parseFloat(analysisResult.fitScore as string) || null : null),
            summary: typeof analysisResult.summary === 'string' ? analysisResult.summary : null,
            skillsMatch: toJsonArray(analysisResult.skillsMatch || analysisResult.matchingSkills),
            missingSkills: toJsonArray(analysisResult.missingSkills),
            strengths: toJsonArray(analysisResult.strengths),
            improvements: toJsonArray(analysisResult.improvements || analysisResult.improvementAreas),
            recommendations: toJsonArray(analysisResult.recommendations),
            keywordAnalysis: analysisResult.keywordAnalysis && typeof analysisResult.keywordAnalysis === 'object' ? analysisResult.keywordAnalysis as Record<string, unknown> : null,
            rawResponse: analysisContent,
            agentSkill: 'APPLICATION_OPTIMIZER',
            creditsUsed: skill.creditCost,
          },
        })

        await db.jobApplication.update({
          where: { id: jobApplication.id },
          data: { status: 'ANALYZED' },
        })

        return NextResponse.json({
          jobApplication: { ...jobApplication, status: 'ANALYZED' },
          analysis,
        }, { status: 201 })
      } catch (analysisError) {
        console.error('Analysis failed, saving application as draft:', analysisError)
        await db.jobApplication.update({
          where: { id: jobApplication.id },
          data: { status: 'DRAFT' },
        })

        return NextResponse.json({
          jobApplication: { ...jobApplication, status: 'DRAFT' },
          analysisError: 'Analysis failed. You can retry later.',
        }, { status: 201 })
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
