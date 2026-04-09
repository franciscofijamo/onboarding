import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { z } from 'zod'

const VALID_QUESTION_TYPES = ['TECHNICAL', 'BEHAVIORAL', 'SITUATIONAL', 'COMPETENCY', 'MIXED'] as const

const AIQuestionSchema = z.object({
  prompt: z.string().min(10, 'Question prompt must be at least 10 characters'),
  question_type: z.enum(VALID_QUESTION_TYPES).default('MIXED'),
})

const AIResponseSchema = z.object({
  questions: z.array(AIQuestionSchema).min(1, 'At least one question must be returned'),
})

export const runtime = 'nodejs'
export const maxDuration = 120

const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: postingId, stageId } = await params

    const recruiter = await db.user.findUnique({ where: { clerkId }, select: { id: true, role: true } })
    if (!recruiter || recruiter.role !== 'RECRUITER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const posting = await db.jobPosting.findFirst({
      where: { id: postingId, company: { userId: recruiter.id } },
      select: { id: true, title: true, description: true },
    })
    if (!posting) return NextResponse.json({ error: 'Posting not found' }, { status: 404 })

    const stage = await db.recruitmentInterviewStage.findFirst({
      where: { id: stageId, jobPostingId: postingId },
      include: { questions: { select: { prompt: true } } },
    })
    if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

    if (stage.status === 'PUBLISHED') {
      return NextResponse.json({ error: 'Cannot regenerate questions for a published stage' }, { status: 400 })
    }

    // Collect prompts already in this posting's stages to avoid repetition
    const existingStages = await db.recruitmentInterviewStage.findMany({
      where: { jobPostingId: postingId },
      include: { questions: { select: { prompt: true } } },
    })
    const existingPrompts = existingStages.flatMap(s => s.questions.map(q => q.prompt))

    const prompt = buildRecruiterInterviewPrompt(
      posting.title,
      posting.description,
      stage.questionCount,
      stage.focusType,
      existingPrompts,
    )

    let generatedQuestions: { prompt: string; question_type: string }[]
    try {
      const result = await generateText({
        model: PROVIDER('google/gemini-2.0-flash-001'),
        prompt,
        temperature: 0.5,
        maxOutputTokens: 4000,
      })

      const text = result.text.trim()
      // Extract JSON object — tolerates surrounding markdown/text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('AI response contains no JSON object')
      const rawParsed = JSON.parse(jsonMatch[0])

      // Strict schema validation — rejects malformed payloads before any DB write
      const validation = AIResponseSchema.safeParse(rawParsed)
      if (!validation.success) {
        const issues = validation.error.flatten().fieldErrors
        throw new Error(`AI payload failed validation: ${JSON.stringify(issues)}`)
      }
      generatedQuestions = validation.data.questions.slice(0, stage.questionCount)
    } catch (aiErr) {
      console.error('AI question generation error:', aiErr)
      return NextResponse.json({ error: 'Failed to generate questions. Please try again.' }, { status: 502 })
    }

    // Server-side deduplication: remove generated questions whose prompts are too
    // similar to prompts already used in OTHER stages of this posting.
    // (The current stage's questions are about to be replaced, so exclude them.)
    const otherStagePrompts = existingStages
      .filter(s => s.id !== stageId)
      .flatMap(s => s.questions.map(q => normalizePrompt(q.prompt)))

    const deduplicated = generatedQuestions.filter(q => {
      const norm = normalizePrompt(q.prompt)
      return !otherStagePrompts.some(existing => promptsAreDuplicate(norm, existing))
    })

    // Enforce minimum count after deduplication
    if (deduplicated.length === 0) {
      return NextResponse.json(
        { error: 'All generated questions were duplicates of existing stages. Please regenerate.' },
        { status: 422 }
      )
    }

    // Delete existing questions for this stage and replace
    await db.recruitmentInterviewQuestion.deleteMany({ where: { stageId } })
    await db.recruitmentInterviewQuestion.createMany({
      data: deduplicated.map((q, i) => ({
        stageId,
        prompt: q.prompt,
        questionType: q.question_type || 'MIXED',
        order: i,
        isEdited: false,
      })),
    })

    const updatedStage = await db.recruitmentInterviewStage.findUnique({
      where: { id: stageId },
      include: { questions: { orderBy: { order: 'asc' } } },
    })

    const dedupWarning =
      deduplicated.length < stage.questionCount
        ? `Only ${deduplicated.length} of ${stage.questionCount} requested questions could be generated without repeating prior stages. You can regenerate or edit the remaining questions.`
        : null

    return NextResponse.json({ stage: updatedStage, warning: dedupWarning })
  } catch (err) {
    console.error('Generate questions error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/** Normalize a prompt for deduplication comparison */
function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Returns true if two normalized prompts are considered duplicates (>=70% word overlap) */
function promptsAreDuplicate(a: string, b: string): boolean {
  if (a === b) return true
  const wordsA = new Set(a.split(' ').filter(w => w.length > 3))
  const wordsB = new Set(b.split(' ').filter(w => w.length > 3))
  if (wordsA.size === 0 || wordsB.size === 0) return false
  let overlap = 0
  for (const w of wordsA) if (wordsB.has(w)) overlap++
  const similarity = overlap / Math.max(wordsA.size, wordsB.size)
  return similarity >= 0.7
}

function buildRecruiterInterviewPrompt(
  jobTitle: string,
  jobDescription: string,
  questionCount: number,
  focusType: string,
  existingPrompts: string[],
): string {
  const jdExcerpt = jobDescription.slice(0, 2500)

  const focusInstructions: Record<string, string> = {
    TECHNICAL: `All ${questionCount} questions must be TECHNICAL — assessing role-specific knowledge, problem-solving, tools, or technical skills.`,
    BEHAVIORAL: `All ${questionCount} questions must be BEHAVIORAL — using "Tell me about a time..." format to assess past behaviour, soft skills, and work style.`,
    MIXED: `Generate a balanced mix: roughly equal parts BEHAVIORAL, SITUATIONAL, TECHNICAL, and COMPETENCY questions.`,
  }

  const focusText = focusInstructions[focusType] || focusInstructions.MIXED

  const existingSection = existingPrompts.length > 0
    ? `\nDO NOT REPEAT THESE QUESTIONS (already used for this job):\n${existingPrompts.slice(0, 30).map(p => `- ${p}`).join('\n')}\n`
    : ''

  return `You are a senior hiring manager creating interview questions for a specific job role.

JOB DETAILS:
Position: ${jobTitle}

JOB DESCRIPTION:
${jdExcerpt}

INSTRUCTIONS:
${focusText}
- Each question must be directly tied to the job description requirements
- Phrase questions as an interviewer would ask them (second person)
- Make questions specific — reference actual skills, responsibilities, or scenarios from the job description
- Each response should require 2–4 minutes from the candidate
${existingSection}
RESPONSE FORMAT (strict JSON):
{
  "questions": [
    {
      "prompt": "Tell me about a time you [specific skill from job description]...",
      "question_type": "BEHAVIORAL"
    }
  ]
}

Generate exactly ${questionCount} questions. Respond ONLY with JSON, no markdown, no code blocks.`
}
