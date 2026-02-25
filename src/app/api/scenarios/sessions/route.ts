import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { deductCreditsForFeature, refundCreditsForFeature } from '@/lib/credits/deduct'
import { InsufficientCreditsError } from '@/lib/credits/errors'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { wrapPromptWithLanguage } from '@/lib/ai-language'

export const runtime = 'nodejs'
export const maxDuration = 120

const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const SCENARIO_TYPE_LABELS: Record<string, string> = {
  TEAM_MEETING: 'Team Meeting',
  CLIENT_CALL: 'Client Call',
  PRESENTATION: 'Presentation',
  EMAIL_DICTATION: 'Email Dictation',
  CONFLICT_RESOLUTION: 'Conflict Resolution',
  PERFORMANCE_REVIEW: 'Performance Review',
  NEGOTIATION: 'Negotiation',
}

const GENERATION_STEPS_COUNT = 5

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

    const sessions = await db.workplaceScenarioSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
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

    const hasProfile = !!(user.careerPath || user.industry || user.currentRole || user.targetRole)

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
        scenarioType: s.scenarioType,
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
      canGenerate: hasProfile,
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

    const hasProfile = !!(user.careerPath || user.industry || user.currentRole || user.targetRole)
    if (!hasProfile) {
      return NextResponse.json({
        error: 'Please complete your profile with career information to generate workplace scenarios.',
      }, { status: 400 })
    }

    const existingSessions = await db.workplaceScenarioSession.findMany({
      where: { userId: user.id },
      include: { responses: { select: { prompt: true } } },
    })
    const existingPrompts = existingSessions.flatMap(s => s.responses.map(r => r.prompt))

    let creditsDeducted = false
    try {
      await deductCreditsForFeature({
        clerkUserId: clerkId,
        feature: 'scenario_simulation',
        details: { userId: user.id, action: 'generate_scenarios' },
      })
      creditsDeducted = true
    } catch (deductErr) {
      if (deductErr instanceof InsufficientCreditsError) {
        return NextResponse.json({
          error: 'Insufficient credits',
          required: deductErr.required,
          available: deductErr.available,
        }, { status: 402 })
      }
      throw deductErr
    }

    let language: string | null = null
    let scenarioType: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      language = body?.language || null
      scenarioType = body?.scenarioType || null
    } catch { }

    const basePrompt = buildScenarioPrompt(user, existingPrompts, scenarioType)
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
      if (!jsonMatch) {
        throw new Error('AI response is not valid JSON')
      }
      scenariosData = JSON.parse(jsonMatch[0])

      if (!scenariosData.scenarios || scenariosData.scenarios.length < GENERATION_STEPS_COUNT) {
        throw new Error('AI generated less than 5 scenarios')
      }
    } catch (aiError) {
      console.error('AI scenario generation error:', aiError)

      if (creditsDeducted) {
        await refundCreditsForFeature({
          clerkUserId: clerkId,
          feature: 'scenario_simulation',
          quantity: 1,
          reason: aiError instanceof Error ? aiError.message : 'ai_generation_error',
          details: { userId: user.id },
        }).catch(refundErr => console.error('Refund failed:', refundErr))
      }

      return NextResponse.json({
        error: 'Error generating scenarios. Your credits have been refunded.',
      }, { status: 502 })
    }

    const uniqueScenarios = scenariosData.scenarios
      .filter(
        (s, i, arr) =>
          !existingPrompts.includes(s.prompt) &&
          arr.findIndex(x => x.prompt === s.prompt) === i
      )
      .slice(0, 5)

    const sessionNumber = existingSessions.length + 1
    const resolvedType = scenarioType && SCENARIO_TYPE_LABELS[scenarioType]
      ? scenarioType
      : uniqueScenarios[0]?.scenario_type || null

    const session = await db.workplaceScenarioSession.create({
      data: {
        userId: user.id,
        name: `Session ${sessionNumber}`,
        scenarioType: resolvedType as any,
        totalQuestions: uniqueScenarios.length,
        responses: {
          create: uniqueScenarios.map((s, index) => ({
            questionIndex: index,
            prompt: s.prompt,
          })),
        },
      },
      include: {
        responses: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    })

    return NextResponse.json({
      session: {
        id: session.id,
        name: session.name,
        scenarioType: session.scenarioType,
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
    console.error('Error creating scenario session:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

interface ScenarioData {
  prompt: string
  scenario_type: string
  context: string
}

function buildScenarioPrompt(
  user: { careerPath?: string | null; industry?: string | null; currentRole?: string | null; targetRole?: string | null; experienceLevel?: string | null; englishLevel?: string | null; skills?: string[] },
  existingPrompts: string[],
  scenarioType?: string | null,
): string {
  const profileParts: string[] = []
  if (user.industry) profileParts.push(`Industry: ${user.industry}`)
  if (user.currentRole) profileParts.push(`Current Role: ${user.currentRole}`)
  if (user.targetRole) profileParts.push(`Target Role: ${user.targetRole}`)
  if (user.careerPath) profileParts.push(`Career Path: ${user.careerPath}`)
  if (user.experienceLevel) profileParts.push(`Experience Level: ${user.experienceLevel}`)
  if (user.englishLevel) profileParts.push(`English Level: ${user.englishLevel}`)
  if (user.skills?.length) profileParts.push(`Skills: ${user.skills.join(', ')}`)

  const profileSection = profileParts.length > 0
    ? `USER PROFILE:\n${profileParts.join('\n')}\n`
    : ''

  const existingSection = existingPrompts.length > 0
    ? `\nEXISTING PROMPTS (DO NOT REPEAT):\n${existingPrompts.slice(0, 30).map(p => `- ${p}`).join('\n')}\n`
    : ''

  const typeFilter = scenarioType && SCENARIO_TYPE_LABELS[scenarioType]
    ? `\nFOCUS: Generate all scenarios of type "${SCENARIO_TYPE_LABELS[scenarioType]}"\n`
    : `\nDISTRIBUTE scenarios across these types: ${Object.values(SCENARIO_TYPE_LABELS).join(', ')}\n`

  return `You are an expert Business English coach specializing in workplace communication training. Your task is to create 5 realistic workplace scenario prompts for the user to practice responding to via audio.

${profileSection}
CONTEXT:
These scenarios simulate real day-to-day workplace situations where the user needs to communicate professionally in English. Each scenario should feel authentic and challenge the user's Business English skills.

SCENARIO CATEGORIES:
- Team Meeting: Leading or participating in team discussions, stand-ups, retrospectives
- Client Call: Speaking with clients, handling requests, presenting solutions
- Presentation: Delivering project updates, pitching ideas, presenting results
- Email Dictation: Composing professional emails verbally (the user speaks as if dictating)
- Conflict Resolution: Handling disagreements, giving difficult feedback, mediating
- Performance Review: Self-assessment discussions, giving/receiving feedback
- Negotiation: Salary discussions, contract terms, project scope negotiations
${typeFilter}
${existingSection}

INSTRUCTIONS:
1. Generate exactly 5 unique workplace scenario prompts
2. Each prompt should set the scene and ask the user to respond as if they were in that situation
3. Prompts must be DIFFERENT from existing ones
4. Personalize scenarios based on the user's industry and role
5. Include specific context (names, situations, numbers) to make scenarios realistic
6. Scenarios should test: vocabulary, formality, clarity, persuasion, and professionalism
7. Each scenario should require a 1-3 minute spoken response

RESPONSE FORMAT (strict JSON):
{
  "scenarios": [
    {
      "prompt": "You are in a team meeting and your manager asks you to provide a status update on the Q3 marketing campaign. Two stakeholders are present who are not familiar with the project details. Present your update clearly, covering progress, challenges, and next steps.",
      "scenario_type": "TEAM_MEETING",
      "context": "Professional meeting context requiring clear communication"
    }
  ]
}

Respond ONLY with JSON, no markdown, no code blocks, no additional text.`
}
