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

const CATEGORY_LABELS: Record<string, string> = {
    behavioral: 'Behavioral',
    technical: 'Technical',
    situational: 'Situational',
    culture_fit: 'Culture Fit',
    business_english: 'Business English',
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

        const decks = await db.flashcardDeck.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { flashcards: true, sessions: true } },
            },
        })

        const totalCards = decks.reduce((sum, d) => sum + d.totalCards, 0)
        const totalStudied = decks.reduce((sum, d) => sum + d.studiedCards, 0)
        const totalSessions = decks.reduce((sum, d) => sum + d._count.sessions, 0)

        return NextResponse.json({
            decks: decks.map(d => ({
                id: d.id,
                name: d.name,
                category: d.category,
                totalCards: d.totalCards,
                studiedCards: d.studiedCards,
                progress: d.totalCards > 0 ? Math.round((d.studiedCards / d.totalCards) * 100) : 0,
                sessionsCount: d._count.sessions,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
            })),
            stats: {
                totalDecks: decks.length,
                totalCards,
                totalStudied,
                totalSessions,
                progressPercentage: totalCards > 0 ? Math.round((totalStudied / totalCards) * 100) : 0,
            },
        })
    } catch (error) {
        console.error('Error fetching decks:', error)
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

        const latestResume = await db.resume.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        })

        if (!latestResume || !latestResume.content) {
            return NextResponse.json({
                error: 'You need to upload a CV/resume first.',
            }, { status: 400 })
        }

        const latestJobApp = await db.jobApplication.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        })

        if (!latestJobApp) {
            return NextResponse.json({
                error: 'You need to add a job description first.',
            }, { status: 400 })
        }

        const existingDecks = await db.flashcardDeck.findMany({
            where: { userId: user.id },
            include: { flashcards: { select: { question: true } } },
        })
        const existingQuestions = existingDecks.flatMap(d => d.flashcards.map(f => f.question))

        let creditsDeducted = false
        try {
            await deductCreditsForFeature({
                clerkUserId: clerkId,
                feature: 'interview_prep',
                details: { userId: user.id },
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
        try {
            const body = await request.json().catch(() => ({}))
            language = body?.language || null
        } catch { }

        const basePrompt = buildFlashcardPrompt(
            latestResume.content,
            latestJobApp.jobDescription,
            latestJobApp.jobTitle || undefined,
            latestJobApp.companyName || undefined,
            user.industry || undefined,
            user.experienceLevel || undefined,
            existingQuestions
        )
        const prompt = wrapPromptWithLanguage(basePrompt, language)

        let flashcardsData: { flashcards: FlashcardData[] }
        try {
            const result = await generateText({
                model: PROVIDER('google/gemini-2.0-flash-001'),
                prompt,
                temperature: 0.4,
                maxOutputTokens: 8000,
                experimental_telemetry: {
                    isEnabled: true,
                    functionId: 'mock-interview-deck-generation',
                    metadata: { posthog_distinct_id: clerkId },
                },
            })

            const text = result.text.trim()
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('AI response is not valid JSON')
            }
            flashcardsData = JSON.parse(jsonMatch[0])

            if (!flashcardsData.flashcards || flashcardsData.flashcards.length < 15) {
                throw new Error('AI generated less than 15 flashcards')
            }
        } catch (aiError) {
            console.error('AI generation error:', aiError)

            if (creditsDeducted) {
                await refundCreditsForFeature({
                    clerkUserId: clerkId,
                    feature: 'interview_prep',
                    quantity: 1,
                    reason: aiError instanceof Error ? aiError.message : 'ai_generation_error',
                    details: { userId: user.id },
                }).catch(refundErr => console.error('Refund failed:', refundErr))
            }

            return NextResponse.json({
                error: 'Error generating flashcards. Your credits have been refunded.',
            }, { status: 502 })
        }

        const uniqueFlashcards = flashcardsData.flashcards.filter(
            (f, i, arr) =>
                !existingQuestions.includes(f.question) &&
                arr.findIndex(x => x.question === f.question) === i
        )

        const deckNumber = existingDecks.length + 1
        const deck = await db.flashcardDeck.create({
            data: {
                userId: user.id,
                name: `Interview Prep Deck ${deckNumber}`,
                category: 'BEHAVIORAL',
                totalCards: uniqueFlashcards.length,
                flashcards: {
                    create: uniqueFlashcards.map((card, index) => ({
                        question: card.question,
                        answer: card.answer,
                        category: card.category || 'behavioral',
                        relatedSkill: card.related_skill || null,
                        tips: card.tips || null,
                        order: index,
                    })),
                },
            },
            include: {
                flashcards: true,
            },
        })

        return NextResponse.json({
            deck: {
                id: deck.id,
                name: deck.name,
                totalCards: deck.totalCards,
                createdAt: deck.createdAt,
            },
            flashcardsCount: deck.flashcards.length,
        })
    } catch (error) {
        console.error('Error creating deck:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

interface FlashcardData {
    question: string
    answer: string
    category: string
    related_skill?: string
    tips?: string
}

function buildFlashcardPrompt(
    resumeText: string,
    jobDescription: string,
    jobTitle?: string,
    companyName?: string,
    industry?: string,
    experienceLevel?: string,
    existingQuestions: string[] = []
): string {
    const jobContext = [
        jobTitle ? `Job Title: ${jobTitle}` : '',
        companyName ? `Company: ${companyName}` : '',
        industry ? `Industry: ${industry}` : '',
        experienceLevel ? `Experience Level: ${experienceLevel}` : '',
    ].filter(Boolean).join('\n')

    const existingSection = existingQuestions.length > 0
        ? `\nEXISTING QUESTIONS (DO NOT REPEAT):\n${existingQuestions.slice(0, 50).map(q => `- ${q}`).join('\n')}\n`
        : ''

    return `You are an expert job interview coach with 10+ years of experience preparing candidates for professional interviews. Your task is to create flashcards to help the candidate prepare for their job interview.

CONTEXT:
${jobContext}

CANDIDATE'S CV/RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}
${existingSection}

INSTRUCTIONS:
1. Generate exactly 18 unique flashcards based on the candidate's CV and the job description
2. Distribute across categories:
   - behavioral (30%, ~5 cards): Questions about past experiences using STAR method (Situation, Task, Action, Result)
   - technical (25%, ~5 cards): Questions about technical skills and knowledge relevant to the role
   - situational (20%, ~4 cards): Hypothetical workplace scenarios the candidate might face
   - culture_fit (15%, ~2 cards): Questions about values, teamwork, and company culture alignment
   - business_english (10%, ~2 cards): Questions testing professional English communication

3. For each flashcard, provide:
   - question: A realistic interview question tailored to this specific role and candidate
   - answer: A model answer using STAR method adapted for professional context (2-3 paragraphs)
   - category: One of the 5 categories above
   - related_skill: The skill or competency being assessed (e.g., "leadership", "python", "communication")
   - tips: Brief tip for the candidate on how to approach this question

RESPONSE FORMAT (strict JSON):
{
  "flashcards": [
    {
      "question": "Tell me about a time you had to lead a cross-functional team to deliver a project under tight deadlines...",
      "answer": "In my role at [Company], I was tasked with... [STAR structure with Situation, Task, Action, Result]",
      "category": "behavioral",
      "related_skill": "leadership",
      "tips": "Focus on specific metrics and measurable impact"
    }
  ]
}

Respond ONLY with the JSON, no markdown, no code blocks, no additional text.`
}
