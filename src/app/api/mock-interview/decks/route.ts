import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { deductCreditsForFeature, refundCreditsForFeature } from '@/lib/credits/deduct'
import { InsufficientCreditsError } from '@/lib/credits/errors'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { wrapPromptWithLanguage } from '@/lib/ai-language'
import { EssayType } from '../../../../../prisma/generated/client'

export const runtime = 'nodejs'
export const maxDuration = 120

const PROVIDER = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
})

const ESSAY_TYPE_LABELS: Record<string, string> = {
    LEADERSHIP: 'Leadership & Influencing',
    NETWORKING: 'Networking',
    COURSE_CHOICES: 'Course Choices',
    CAREER_PLAN: 'Career Plan',
}

const CHEVENING_ESSAY_TYPES = [
    EssayType.LEADERSHIP,
    EssayType.NETWORKING,
    EssayType.COURSE_CHOICES,
    EssayType.CAREER_PLAN,
]

// GET - List user's decks
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

        // Get aggregate stats
        const totalCards = decks.reduce((sum, d) => sum + d.totalCards, 0)
        const totalStudied = decks.reduce((sum, d) => sum + d.studiedCards, 0)
        const totalSessions = decks.reduce((sum, d) => sum + d._count.sessions, 0)

        return NextResponse.json({
            decks: decks.map(d => ({
                id: d.id,
                name: d.name,
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

// POST - Generate new deck
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

        // Check if user has 4 analyzed Chevening essays
        // Note: Don't filter by scholarship to support legacy essays
        const essays = await db.essay.findMany({
            where: {
                userId: user.id,
                type: { in: CHEVENING_ESSAY_TYPES },
                analysisCount: { gt: 0 },
            },
            orderBy: { type: 'asc' },
        })

        if (essays.length < 4) {
            return NextResponse.json({
                error: 'Você precisa ter os 4 essays analisados para gerar flashcards.',
                required: 4,
                current: essays.length,
            }, { status: 400 })
        }

        // Get existing questions to avoid duplicates
        const existingDecks = await db.flashcardDeck.findMany({
            where: { userId: user.id },
            include: { flashcards: { select: { question: true } } },
        })
        const existingQuestions = existingDecks.flatMap(d => d.flashcards.map(f => f.question))

        // Deduct credits
        let creditsDeducted = false
        try {
            await deductCreditsForFeature({
                clerkUserId: clerkId,
                feature: 'mock_interview_deck',
                details: { userId: user.id },
            })
            creditsDeducted = true
        } catch (deductErr) {
            if (deductErr instanceof InsufficientCreditsError) {
                return NextResponse.json({
                    error: 'Créditos insuficientes',
                    required: deductErr.required,
                    available: deductErr.available,
                }, { status: 402 })
            }
            throw deductErr
        }

        // Build prompt
        let language: string | null = null
        try {
            const body = await request.json().catch(() => ({}))
            language = body?.language || null
        } catch { }

        const basePrompt = buildFlashcardPrompt(essays, existingQuestions)
        const prompt = wrapPromptWithLanguage(basePrompt, language)

        // Generate flashcards via AI
        let flashcardsData: { flashcards: FlashcardData[] }
        try {
            const result = await generateText({
                model: PROVIDER('google/gemini-2.0-flash-001'),
                prompt,
                temperature: 0.4,
                maxTokens: 8000,
            })

            const text = result.text.trim()
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('AI response is not valid JSON')
            }
            flashcardsData = JSON.parse(jsonMatch[0])

            // Validate minimum cards
            if (!flashcardsData.flashcards || flashcardsData.flashcards.length < 15) {
                throw new Error('AI generated less than 15 flashcards')
            }
        } catch (aiError) {
            console.error('AI generation error:', aiError)

            if (creditsDeducted) {
                await refundCreditsForFeature({
                    clerkUserId: clerkId,
                    feature: 'mock_interview_deck',
                    quantity: 1,
                    reason: aiError instanceof Error ? aiError.message : 'ai_generation_error',
                    details: { userId: user.id },
                }).catch(refundErr => console.error('Refund failed:', refundErr))
            }

            return NextResponse.json({
                error: 'Erro ao gerar flashcards. Seus créditos foram reembolsados.',
            }, { status: 502 })
        }

        // Remove duplicates
        const uniqueFlashcards = flashcardsData.flashcards.filter(
            (f, i, arr) =>
                !existingQuestions.includes(f.question) &&
                arr.findIndex(x => x.question === f.question) === i
        )

        // Create deck and flashcards
        const deckNumber = existingDecks.length + 1
        const deck = await db.flashcardDeck.create({
            data: {
                userId: user.id,
                name: `Deck ${deckNumber}`,
                totalCards: uniqueFlashcards.length,
                flashcards: {
                    create: uniqueFlashcards.map((card, index) => ({
                        question: card.question,
                        answer: card.answer,
                        category: card.category || 'validation',
                        relatedEssay: card.related_essay || null,
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
    related_essay?: number
    tips?: string
}

function buildFlashcardPrompt(
    essays: { type: string; content: string }[],
    existingQuestions: string[]
): string {
    const essayContents = essays.map((e, i) => {
        const label = ESSAY_TYPE_LABELS[e.type] || e.type
        return `--- ESSAY ${i + 1}: ${label} ---\n${e.content}\n`
    }).join('\n')

    const existingSection = existingQuestions.length > 0
        ? `\nPERGUNTAS JÁ EXISTENTES (NÃO REPETIR):\n${existingQuestions.slice(0, 50).map(q => `- ${q}`).join('\n')}\n`
        : ''

    return `Você é um especialista em preparação para entrevistas Chevening com mais de 10 anos de experiência. Sua tarefa é criar flashcards de estudo para ajudar o candidato a se preparar para a entrevista real.

CONTEXTO SOBRE A ENTREVISTA CHEVENING:
- Painel de 2-3 avaliadores, duração de 20-30 minutos
- Os entrevistadores LEEM os essays ANTES da entrevista
- Perguntas são baseadas no conteúdo específico dos essays do candidato
- Formato: perguntas comportamentais (STAR), situacionais e de aprofundamento

ESSAYS DO CANDIDATO:
${essayContents}
${existingSection}

INSTRUÇÕES:
1. Gere exatamente 18 flashcards únicos
2. Distribua nas categorias:
   - validation (40%, ~7 cards): Perguntas sobre experiências específicas mencionadas nos essays
   - deepening (30%, ~5 cards): Perguntas de aprofundamento (desafios, métricas, aprendizados)
   - situational (20%, ~4 cards): Cenários hipotéticos baseados no perfil
   - consistency (10%, ~2 cards): Perguntas que conectam informações entre diferentes essays

3. Para cada flashcard, forneça:
   - question: Pergunta realística de entrevista
   - answer: Resposta modelo usando estrutura STAR (2-3 parágrafos)
   - category: Uma das 4 categorias acima
   - related_essay: Número do essay (1-4) relacionado
   - tips: Dica breve para o candidato

FORMATO DE RESPOSTA (JSON estrito):
{
  "flashcards": [
    {
      "question": "Tell me more about the leadership project you mentioned in your essay...",
      "answer": "In 2024, I led a digital literacy initiative... [STAR structure with Situation, Task, Action, Result]",
      "category": "validation",
      "related_essay": 1,
      "tips": "Focus on specific metrics and measurable impact"
    }
  ]
}

Responda APENAS com o JSON, sem markdown, sem código de bloco, sem texto adicional.`
}
