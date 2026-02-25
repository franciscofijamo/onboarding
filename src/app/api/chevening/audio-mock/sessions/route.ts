import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { deductCreditsForFeature, refundCreditsForFeature } from '@/lib/credits/deduct'
import { InsufficientCreditsError } from '@/lib/credits/errors'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { wrapPromptWithLanguage } from '@/lib/ai-language'
import { EssayType } from '../../../../../../prisma/generated/client'

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

    const sessions = await db.audioInterviewSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        responses: {
          orderBy: { questionIndex: 'asc' },
          select: {
            id: true,
            questionIndex: true,
            question: true,
            status: true,
            score: true,
            duration: true,
          },
        },
      },
    })

    const essays = await db.essay.findMany({
      where: {
        userId: user.id,
        type: { in: CHEVENING_ESSAY_TYPES },
        analysisCount: { gt: 0 },
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
        totalQuestions: s.totalQuestions,
        answeredCount: s.answeredCount,
        analyzedCount: s.analyzedCount,
        averageScore: s.averageScore,
        createdAt: s.createdAt,
        responses: s.responses,
      })),
      stats: {
        totalSessions,
        totalAnalyzed,
        averageScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
      },
      canGenerate: essays.length >= 4,
      essaysAnalyzed: essays.length,
    })
  } catch (error) {
    console.error('Error fetching audio sessions:', error)
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
        error: 'Você precisa ter os 4 essays analisados para gerar perguntas de entrevista.',
        required: 4,
        current: essays.length,
      }, { status: 400 })
    }

    const existingSessions = await db.audioInterviewSession.findMany({
      where: { userId: user.id },
      include: { responses: { select: { question: true } } },
    })
    const existingQuestions = existingSessions.flatMap(s => s.responses.map(r => r.question))

    let creditsDeducted = false
    try {
      await deductCreditsForFeature({
        clerkUserId: clerkId,
        feature: 'audio_interview',
        details: { userId: user.id, action: 'generate_questions' },
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

    let language: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      language = body?.language || null
    } catch { }

    const basePrompt = buildAudioInterviewPrompt(essays, existingQuestions)
    const prompt = wrapPromptWithLanguage(basePrompt, language)

    let questionsData: { questions: QuestionData[] }
    try {
      const result = await generateText({
        model: PROVIDER('google/gemini-2.0-flash-001'),
        prompt,
        temperature: 0.5,
        maxTokens: 4000,
      })

      const text = result.text.trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI response is not valid JSON')
      }
      questionsData = JSON.parse(jsonMatch[0])

      if (!questionsData.questions || questionsData.questions.length < 5) {
        throw new Error('AI generated less than 5 questions')
      }
    } catch (aiError) {
      console.error('AI question generation error:', aiError)

      if (creditsDeducted) {
        await refundCreditsForFeature({
          clerkUserId: clerkId,
          feature: 'audio_interview',
          quantity: 1,
          reason: aiError instanceof Error ? aiError.message : 'ai_generation_error',
          details: { userId: user.id },
        }).catch(refundErr => console.error('Refund failed:', refundErr))
      }

      return NextResponse.json({
        error: 'Erro ao gerar perguntas. Seus créditos foram reembolsados.',
      }, { status: 502 })
    }

    const uniqueQuestions = questionsData.questions
      .filter(
        (q, i, arr) =>
          !existingQuestions.includes(q.question) &&
          arr.findIndex(x => x.question === q.question) === i
      )
      .slice(0, 5)

    const sessionNumber = existingSessions.length + 1
    const session = await db.audioInterviewSession.create({
      data: {
        userId: user.id,
        name: `Sessão ${sessionNumber}`,
        totalQuestions: uniqueQuestions.length,
        responses: {
          create: uniqueQuestions.map((q, index) => ({
            questionIndex: index,
            question: q.question,
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
        totalQuestions: session.totalQuestions,
        createdAt: session.createdAt,
        responses: session.responses.map(r => ({
          id: r.id,
          questionIndex: r.questionIndex,
          question: r.question,
          status: r.status,
        })),
      },
    })
  } catch (error) {
    console.error('Error creating audio session:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

interface QuestionData {
  question: string
  category: string
  related_essay?: number
}

function buildAudioInterviewPrompt(
  essays: { type: string; content: string }[],
  existingQuestions: string[]
): string {
  const essayContents = essays.map((e, i) => {
    const label = ESSAY_TYPE_LABELS[e.type] || e.type
    return `--- ESSAY ${i + 1}: ${label} ---\n${e.content}\n`
  }).join('\n')

  const existingSection = existingQuestions.length > 0
    ? `\nPERGUNTAS JÁ EXISTENTES (NÃO REPETIR):\n${existingQuestions.slice(0, 30).map(q => `- ${q}`).join('\n')}\n`
    : ''

  return `Você é um especialista em preparação para entrevistas Chevening com mais de 10 anos de experiência. Sua tarefa é criar 5 perguntas de entrevista oral para o candidato praticar respondendo em áudio.

CONTEXTO SOBRE A ENTREVISTA CHEVENING:
- Painel de 2-3 avaliadores, duração de 20-30 minutos
- Os entrevistadores LEEM os essays ANTES da entrevista
- Perguntas são baseadas no conteúdo específico dos essays do candidato
- Formato: perguntas comportamentais (STAR), situacionais e de aprofundamento
- O candidato responde ORALMENTE (não por escrito)

ESSAYS DO CANDIDATO:
${essayContents}
${existingSection}

INSTRUÇÕES:
1. Gere exatamente 5 perguntas de entrevista únicas
2. As perguntas devem ser DIFERENTES das já existentes
3. Distribua as perguntas nas categorias:
   - validation (2 perguntas): Sobre experiências específicas dos essays
   - deepening (1 pergunta): Aprofundamento sobre desafios, métricas, aprendizados
   - situational (1 pergunta): Cenário hipotético baseado no perfil
   - consistency (1 pergunta): Conexão entre informações de diferentes essays

4. As perguntas devem ser:
   - Naturais e conversacionais (como numa entrevista real)
   - Específicas ao conteúdo dos essays do candidato
   - Desafiadoras mas justas
   - Formuladas para respostas de 1-3 minutos

FORMATO DE RESPOSTA (JSON estrito):
{
  "questions": [
    {
      "question": "Can you tell me more about the leadership project you mentioned in your essay? What specific challenges did you face?",
      "category": "validation",
      "related_essay": 1
    }
  ]
}

Responda APENAS com o JSON, sem markdown, sem código de bloco, sem texto adicional.`
}
