import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { InsufficientCreditsError } from '@/lib/credits/errors'
import { toPrismaOperationType } from '@/lib/credits/feature-config'
import { getFeatureCost, getPlanCredits } from '@/lib/credits/settings'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { wrapPromptWithLanguage } from '@/lib/ai-language'

export const runtime = 'nodejs'
export const maxDuration = 120

const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const GENERATION_STEPS_COUNT = 5
const SCENARIO_FEATURE = 'scenario_simulation'
const GENERATION_FAILED_CODE = 'SCENARIO_GENERATION_FAILED'
const INSUFFICIENT_UNIQUE_CODE = 'SCENARIO_GENERATION_INSUFFICIENT_UNIQUE'

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const jobApplicationId = searchParams.get('jobApplicationId')

    const whereClause = jobApplicationId
      ? { userId: user.id, jobApplicationId }
      : { userId: user.id }

    const sessions = await db.workplaceScenarioSession.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        jobApplication: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            status: true,
          },
        },
        recruitmentStage: {
          select: {
            id: true,
            name: true,
            focusType: true,
            jobPosting: {
              select: {
                title: true,
                company: { select: { name: true } },
              },
            },
          },
        },
        responses: {
          orderBy: { questionIndex: 'asc' },
          select: {
            id: true,
            questionIndex: true,
            prompt: true,
            status: true,
            score: true,
            duration: true,
          },
        },
      },
    })

    const totalSessions = sessions.length
    const totalAnalyzed = sessions.reduce((sum, s) => sum + s.analyzedCount, 0)
    const analyzedSessions = sessions.filter(s => s.analyzedCount > 0)
    const avgScore = analyzedSessions.length > 0
      ? analyzedSessions.reduce((sum, s) => sum + (s.averageScore ?? 0), 0) / analyzedSessions.length
      : null

    return NextResponse.json({
      sessions: sessions.map(s => ({
        id: s.id,
        name: s.name,
        jobApplicationId: s.jobApplicationId,
        jobApplication: s.jobApplication,
        recruitmentStageId: s.recruitmentStageId,
        recruitmentStage: s.recruitmentStage ? {
          id: s.recruitmentStage.id,
          name: s.recruitmentStage.name,
          focusType: s.recruitmentStage.focusType,
          jobTitle: s.recruitmentStage.jobPosting.title,
          companyName: s.recruitmentStage.jobPosting.company.name,
        } : null,
        totalQuestions: s.totalQuestions,
        answeredCount: s.answeredCount,
        analyzedCount: s.analyzedCount,
        averageScore: s.averageScore,
        createdAt: s.createdAt,
        responses: s.responses.map(r => ({
          ...r,
          question: r.prompt,
        })),
      })),
      stats: {
        totalSessions,
        totalAnalyzed,
        averageScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
      },
    })
  } catch (error) {
    console.error('Error fetching scenario sessions:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

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

    let language: string | null = null
    let jobApplicationId: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      language = body?.language || null
      jobApplicationId = body?.jobApplicationId || null
    } catch { }

    if (!jobApplicationId) {
      return NextResponse.json({
        error: 'A job application is required to generate interview scenarios.',
      }, { status: 400 })
    }

    const jobApplication = await db.jobApplication.findFirst({
      where: { id: jobApplicationId, userId: user.id },
      include: {
        resume: {
          select: { content: true, parsedData: true },
        },
      },
    })

    if (!jobApplication) {
      return NextResponse.json({ error: 'Job application not found.' }, { status: 404 })
    }

    const existingSessions = await db.workplaceScenarioSession.findMany({
      where: { userId: user.id, jobApplicationId },
      include: { responses: { select: { prompt: true } } },
    })
    const existingPrompts = existingSessions.flatMap(s => s.responses.map(r => r.prompt))

    const scenarioCreditCost = await getFeatureCost(SCENARIO_FEATURE)
    const currentBalance = await db.creditBalance.findUnique({ where: { userId: user.id } })
    const availableCredits = currentBalance?.creditsRemaining ?? await getPlanCredits('free')

    if (availableCredits < scenarioCreditCost) {
      return NextResponse.json({
        error: 'Insufficient credits',
        required: scenarioCreditCost,
        available: availableCredits,
      }, { status: 402 })
    }

    const basePrompt = buildInterviewPrompt(
      jobApplication,
      user,
      existingPrompts,
    )
    const prompt = wrapPromptWithLanguage(basePrompt, language)

    let scenariosData: { scenarios: ScenarioData[] }
    try {
      const result = await generateText({
        model: PROVIDER('google/gemini-2.0-flash-001'),
        prompt,
        temperature: 0.5,
        maxOutputTokens: 4000,
      })

      const text = result.text.trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI response is not valid JSON')
      scenariosData = JSON.parse(jsonMatch[0])

      if (!scenariosData.scenarios || scenariosData.scenarios.length < GENERATION_STEPS_COUNT) {
        throw new Error('AI generated less than 5 interview questions')
      }
    } catch (aiError) {
      console.error('[Scenario Generation] AI interview generation failed before charging credits:', {
        code: GENERATION_FAILED_CODE,
        userId: user.id,
        jobApplicationId,
        language,
        existingPromptCount: existingPrompts.length,
        reason: aiError instanceof Error ? aiError.message : String(aiError),
      })
      return NextResponse.json({
        error: GENERATION_FAILED_CODE,
        code: GENERATION_FAILED_CODE,
      }, { status: 502 })
    }

    const uniqueScenarios = scenariosData.scenarios
      .filter(
        (s, i, arr) =>
          !existingPrompts.includes(s.prompt) &&
          arr.findIndex(x => x.prompt === s.prompt) === i
      )
      .slice(0, 5)

    if (uniqueScenarios.length < GENERATION_STEPS_COUNT) {
      console.error('[Scenario Generation] Not enough unique scenarios generated before charging credits:', {
        code: INSUFFICIENT_UNIQUE_CODE,
        userId: user.id,
        jobApplicationId,
        generatedCount: scenariosData.scenarios.length,
        uniqueCount: uniqueScenarios.length,
        existingPromptCount: existingPrompts.length,
      })
      return NextResponse.json({
        error: INSUFFICIENT_UNIQUE_CODE,
        code: INSUFFICIENT_UNIQUE_CODE,
      }, { status: 502 })
    }

    const sessionNumber = existingSessions.length + 1
    const jobLabel = jobApplication.jobTitle && jobApplication.companyName
      ? `${jobApplication.jobTitle} @ ${jobApplication.companyName}`
      : jobApplication.jobTitle || jobApplication.companyName || 'Job Application'

    let session: {
      id: string
      name: string
      jobApplicationId: string | null
      totalQuestions: number
      createdAt: Date
      responses: Array<{
        id: string
        questionIndex: number
        prompt: string
        status: string
      }>
    }
    try {
      session = await db.$transaction(async (tx) => {
        let creditBalance = await tx.creditBalance.findUnique({ where: { userId: user.id } })

        if (!creditBalance) {
          creditBalance = await tx.creditBalance.create({
            data: {
              userId: user.id,
              clerkUserId: clerkId,
              creditsRemaining: await getPlanCredits('free'),
            },
          })
        }

        const updated = await tx.creditBalance.updateMany({
          where: { id: creditBalance.id, creditsRemaining: { gte: scenarioCreditCost } },
          data: {
            creditsRemaining: { decrement: scenarioCreditCost },
            lastSyncedAt: new Date(),
          },
        })

        if (updated.count === 0) {
          throw new InsufficientCreditsError(scenarioCreditCost, creditBalance.creditsRemaining)
        }

        await tx.usageHistory.create({
          data: {
            userId: user.id,
            creditBalanceId: creditBalance.id,
            operationType: toPrismaOperationType(SCENARIO_FEATURE),
            creditsUsed: scenarioCreditCost,
            details: {
              userId: user.id,
              jobApplicationId,
              action: 'generate_interview_scenarios',
            },
          },
        })

        return tx.workplaceScenarioSession.create({
          data: {
            userId: user.id,
            jobApplicationId,
            name: `Interview Practice #${sessionNumber} — ${jobLabel}`,
            totalQuestions: uniqueScenarios.length,
            responses: {
              create: uniqueScenarios.map((s, index) => ({
                questionIndex: index,
                prompt: s.prompt,
              })),
            },
          },
          include: {
            responses: { orderBy: { questionIndex: 'asc' } },
          },
        })
      })
    } catch (transactionError) {
      if (transactionError instanceof InsufficientCreditsError) {
        return NextResponse.json({
          error: 'Insufficient credits',
          required: transactionError.required,
          available: transactionError.available,
        }, { status: 402 })
      }

      throw transactionError
    }

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        jobApplicationId: session.jobApplicationId,
        totalQuestions: session.totalQuestions,
        createdAt: session.createdAt,
        responses: session.responses.map(r => ({
          id: r.id,
          questionIndex: r.questionIndex,
          question: r.prompt,
          status: r.status,
        })),
      },
    })
  } catch (error) {
    console.error('Error creating interview session:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

interface ScenarioData {
  prompt: string
  question_type: string
}

function buildInterviewPrompt(
  jobApplication: {
    jobTitle?: string | null
    companyName?: string | null
    jobDescription: string
    companyInfo?: string | null
    resume?: { content?: string | null; parsedData?: unknown } | null
  },
  user: {
    currentRole?: string | null
    targetRole?: string | null
    experienceLevel?: string | null
    englishLevel?: string | null
    skills?: string[]
  },
  existingPrompts: string[],
): string {
  const jobTitle = jobApplication.jobTitle || 'the position'
  const company = jobApplication.companyName || 'the company'

  const jdExcerpt = (jobApplication.jobDescription || '').slice(0, 2000)

  const parsedData = jobApplication.resume?.parsedData as Record<string, unknown> | null | undefined
  const cvSkills = Array.isArray(parsedData?.skills)
    ? (parsedData!.skills as string[]).join(', ')
    : ''
  const cvText = jobApplication.resume?.content?.slice(0, 1500) || ''
  const userSkills = user.skills?.join(', ') || ''

  const candidateContext = [
    user.currentRole ? `Current Role: ${user.currentRole}` : null,
    user.experienceLevel ? `Experience Level: ${user.experienceLevel}` : null,
    user.englishLevel ? `English Level: ${user.englishLevel}` : null,
    cvSkills ? `CV Skills: ${cvSkills}` : (userSkills ? `Skills: ${userSkills}` : null),
  ].filter(Boolean).join('\n')

  const cvSection = cvText
    ? `\nCANDIDATE CV EXCERPT:\n${cvText}\n`
    : ''

  const existingSection = existingPrompts.length > 0
    ? `\nDO NOT REPEAT THESE QUESTIONS:\n${existingPrompts.slice(0, 20).map(p => `- ${p}`).join('\n')}\n`
    : ''

  return `You are a senior hiring manager and interview coach. Your task is to generate 5 realistic job interview questions for a candidate applying to a specific role.

JOB DETAILS:
Position: ${jobTitle}
Company: ${company}
${jobApplication.companyInfo ? `Company Info: ${jobApplication.companyInfo}\n` : ''}
JOB DESCRIPTION:
${jdExcerpt}

CANDIDATE PROFILE:
${candidateContext}
${cvSection}

QUESTION TYPES TO INCLUDE (mix of all 5):
1. BEHAVIORAL — "Tell me about a time when..." (past experience, STAR method)
2. SITUATIONAL — "What would you do if..." (hypothetical scenarios)
3. COMPETENCY — Skills/strengths specific to the job requirements
4. MOTIVATION — Why this role/company, career goals alignment
5. TECHNICAL — Role-specific knowledge or problem-solving relevant to the job description
${existingSection}

INSTRUCTIONS:
1. Generate exactly 5 interview questions, one of each type
2. Each question must be deeply tied to the JOB DESCRIPTION requirements
3. The question should set clear context and ask the candidate to respond as if in a real interview
4. Make questions specific — reference actual skills, responsibilities, or scenarios from the job description
5. Each response should require 1–3 minutes of spoken English
6. Phrase questions as an interviewer would ask them (second person: "Tell me about a time you...")

RESPONSE FORMAT (strict JSON):
{
  "scenarios": [
    {
      "prompt": "Tell me about a time you [specific skill from job description]. Walk me through the situation, what you did, and the outcome.",
      "question_type": "BEHAVIORAL"
    }
  ]
}

Respond ONLY with JSON, no markdown, no code blocks, no additional text.`
}
