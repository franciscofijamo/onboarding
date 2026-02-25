import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { EssayStatus } from '../../../../../../prisma/generated/client'
import { deductCreditsForFeature, refundCreditsForFeature } from '@/lib/credits/deduct'
import { InsufficientCreditsError } from '@/lib/credits/errors'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { wrapPromptWithLanguage } from '@/lib/ai-language'

export const runtime = 'nodejs'
export const maxDuration = 60

const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const ESSAY_TYPE_LABELS: Record<string, string> = {
  LEADERSHIP: 'Leadership & Influencing',
  NETWORKING: 'Networking',
  COURSE_CHOICES: 'Course Choices',
  CAREER_PLAN: 'Career Plan',
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function buildPrompt(essayType: string, content: string, wordCount: number, previousFeedback?: string, language?: string | null): string {
  const typeLabel = ESSAY_TYPE_LABELS[essayType] || essayType

  let context = ''
  if (previousFeedback) {
    context = `
CONTEXTO DE REANÁLISE:
Este essay já foi analisado anteriormente. O feedback anterior foi:
${previousFeedback}
Verifique se as recomendações prioritárias foram implementadas e destaque a evolução.
`
  }

  return `Você é um avaliador especialista em bolsas Chevening com mais de 10 anos de experiência avaliando candidaturas. Sua tarefa é avaliar o essay "${typeLabel}" de um candidato à bolsa Chevening.

INFORMAÇÕES DO ESSAY:
- Tipo: ${typeLabel}
- Contagem de palavras: ${wordCount}/300
${context}

TEXTO DO ESSAY:
"""
${content}
"""

CRITÉRIOS DE AVALIAÇÃO ESPECÍFICOS POR TIPO:

${getEssaySpecificCriteria(essayType, language)}

INSTRUÇÕES DE AVALIAÇÃO:
1. Avalie cada critério de 1 a 10
2. Identifique pontos fortes específicos com citações do texto
3. Liste pontos de melhoria priorizados (crítico, importante, recomendado)
4. Forneça sugestões concretas de reescrita com comparação antes/depois
5. Verifique uso do método STAR (Situation, Task, Action, Result)
6. Avalie impacto mensurável e evidências concretas
7. Analise alinhamento com valores Chevening (liderança, networking, UK study)

FORMATO DE RESPOSTA (JSON estrito):
{
  "nota_geral": <number 1-10>,
  "status": "<COMPETITIVO|REQUER_MELHORIAS|CRITICO>",
  "criterios": [
    {
      "nome": "<nome do critério>",
      "nota": <number 1-10>,
      "status": "<ATENDIDO|PARCIAL|NAO_ATENDIDO>",
      "justificativa": "<análise detalhada>"
    }
  ],
  "pontos_fortes": [
    {
      "titulo": "<título>",
      "descricao": "<descrição>",
      "citacao": "<trecho do texto, se aplicável>"
    }
  ],
  "pontos_melhoria": [
    {
      "prioridade": "<CRITICO|IMPORTANTE|RECOMENDADO>",
      "problema": "<descrição do problema>",
      "recomendacao": "<o que fazer>",
      "exemplo_reformulacao": "<sugestão concreta>",
      "impacto_esperado": "<como isso melhora o essay>"
    }
  ],
  "sugestoes_reescrita": [
    {
      "original": "<trecho original>",
      "sugerido": "<trecho reescrito>",
      "explicacao": "<por que a mudança>"
    }
  ],
  "alertas_criticos": [
    "<alerta se aplicável, ex: limite de palavras, erros graves>"
  ],
  "comentario_final": {
    "sintese": "<resumo geral da avaliação>",
    "top_3_prioridades": ["<prioridade 1>", "<prioridade 2>", "<prioridade 3>"],
    "probabilidade_aprovacao": "<BAIXA|MEDIA|ALTA>"
  }
}

Responda APENAS com o JSON, sem markdown, sem código de bloco, sem texto adicional.`
}

function getEssaySpecificCriteria(essayType: string, language?: string | null): string {
  const isEnglish = language?.startsWith('en')

  switch (essayType) {
    case 'LEADERSHIP':
      return isEnglish
        ? `For LEADERSHIP & INFLUENCING, evaluate:
1. Clear evidence of leadership (not just management)
2. Ability to influence others without formal authority
3. Use of STAR method with measurable results
4. Reflection on personal leadership style
5. Impact on community/organization
6. Learning and growth as a leader
7. Vision for developing future leadership`
        : `Para LEADERSHIP & INFLUENCING, avalie:
1. Evidência clara de liderança (não apenas gestão)
2. Capacidade de influenciar outros sem autoridade formal
3. Uso do método STAR com resultados mensuráveis
4. Reflexão sobre estilo de liderança pessoal
5. Impacto na comunidade/organização
6. Aprendizado e crescimento como líder
7. Visão de como desenvolver liderança futura`

    case 'NETWORKING':
      return isEnglish
        ? `For NETWORKING, evaluate:
1. Genuine understanding of networking (not just contacts)
2. Concrete examples of network building
3. Mutual contribution (giving and receiving)
4. Plan for networking during and after Chevening
5. Connection with Chevening alumni
6. Strategic use of networks for impact
7. Diversity of networks (professional, academic, community)`
        : `Para NETWORKING, avalie:
1. Compreensão genuína de networking (não apenas contatos)
2. Exemplos concretos de construção de redes
3. Contribuição mútua (dar e receber)
4. Plano para networking durante e após Chevening
5. Conexão com alumni Chevening
6. Uso estratégico de redes para impacto
7. Diversidade de redes (profissional, acadêmica, comunitária)`

    case 'COURSE_CHOICES':
      return isEnglish
        ? `For COURSE CHOICES, evaluate:
1. Clear justification for course/university choice
2. Alignment with career goals
3. Research on the program (content, faculty)
4. Why UK specifically
5. How the course fills knowledge gaps
6. Comparison between chosen universities (if applicable)
7. Connection between course and desired impact in country`
        : `Para COURSE CHOICES, avalie:
1. Justificativa clara para escolha do curso/universidade
2. Alinhamento com objetivos de carreira
3. Pesquisa sobre o programa (conteúdo, professores)
4. Por que UK especificamente
5. Como o curso preenche lacunas de conhecimento
6. Comparação entre universidades escolhidas (se aplicável)
7. Conexão entre curso e impacto desejado no país`

    case 'CAREER_PLAN':
      return isEnglish
        ? `For CAREER PLAN, evaluate:
1. Clarity of career plan (short, medium, long term)
2. Logical connection between past, present and future
3. Impact on home country/region
4. Balance of realism and ambition
5. How Chevening is essential to the plan
6. Defined success metrics
7. Contribution to country development`
        : `Para CAREER PLAN, avalie:
1. Clareza do plano de carreira (curto, médio, longo prazo)
2. Conexão lógica entre passado, presente e futuro
3. Impacto no país/região de origem
4. Realismo e ambição equilibrados
5. Como Chevening é essencial para o plano
6. Métricas de sucesso definidas
7. Contribuição para desenvolvimento do país`

    default:
      return isEnglish
        ? `Evaluate general quality criteria, STAR structure, impact and Chevening alignment.`
        : `Avalie critérios gerais de qualidade, estrutura STAR, impacto e alinhamento com Chevening.`
  }
}

export async function POST(
  request: NextRequest,
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

    const essay = await db.essay.findFirst({
      where: { id, userId: user.id },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!essay) {
      return NextResponse.json({ error: 'Essay not found' }, { status: 404 })
    }

    const wordCount = countWords(essay.content)
    if (wordCount < 100) {
      return NextResponse.json({ error: 'Texto muito curto. Mínimo de 100 palavras.' }, { status: 400 })
    }
    if (wordCount > 300) {
      return NextResponse.json({ error: `Texto excede o limite. ${wordCount}/300 palavras.` }, { status: 400 })
    }

    let creditsDeducted = false

    try {
      await deductCreditsForFeature({
        clerkUserId: clerkId,
        feature: 'essay_analysis',
        details: { essayId: id, essayType: essay.type },
      })
      creditsDeducted = true
    } catch (deductErr) {
      if (deductErr instanceof InsufficientCreditsError) {
        return NextResponse.json(
          { error: 'Créditos insuficientes', required: deductErr.required, available: deductErr.available },
          { status: 402 }
        )
      }
      throw deductErr
    }

    await db.essay.update({
      where: { id },
      data: { status: EssayStatus.ANALYZING },
    })

    const lastVersion = await db.essayVersion.findFirst({
      where: { essayId: id },
      orderBy: { version: 'desc' },
    })
    const nextVersion = (lastVersion?.version ?? 0) + 1

    await db.essayVersion.create({
      data: {
        essayId: id,
        version: nextVersion,
        content: essay.content,
        wordCount,
      },
    })

    let previousFeedbackSummary: string | undefined
    if (essay.analyses.length > 0) {
      const prev = essay.analyses[0]
      const fb = prev.feedback as { nota_geral?: number; comentario_final?: { top_3_prioridades?: string[] } }
      previousFeedbackSummary = `Nota anterior: ${fb.nota_geral || prev.score}/10. Prioridades: ${fb.comentario_final?.top_3_prioridades?.join(', ') || 'N/A'}`
    }

    let language: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      language = body?.language || null
    } catch { }

    const basePrompt = buildPrompt(essay.type, essay.content, wordCount, previousFeedbackSummary, language)
    const prompt = wrapPromptWithLanguage(basePrompt, language)

    let feedback: Record<string, unknown>
    try {
      const result = await generateText({
        model: PROVIDER('google/gemini-2.0-flash-001'),
        prompt,
        temperature: 0.3,
        maxTokens: 4000,
      })

      const text = result.text.trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI response is not valid JSON')
      }
      feedback = JSON.parse(jsonMatch[0])
    } catch (aiError) {
      console.error('AI analysis error:', aiError)

      if (creditsDeducted) {
        await refundCreditsForFeature({
          clerkUserId: clerkId,
          feature: 'essay_analysis',
          quantity: 1,
          reason: aiError instanceof Error ? aiError.message : 'ai_analysis_error',
          details: { essayId: id },
        }).catch(refundErr => console.error('Refund failed:', refundErr))
      }

      await db.essay.update({
        where: { id },
        data: { status: EssayStatus.DRAFT },
      }).catch(updateErr => console.error('Status reset failed:', updateErr))

      return NextResponse.json(
        { error: 'Algo deu errado na análise. Seus créditos foram reembolsados.' },
        { status: 502 }
      )
    }

    const score = typeof feedback.nota_geral === 'number' ? feedback.nota_geral : 5

    const analysis = await db.essayAnalysis.create({
      data: {
        essayId: id,
        versionNumber: nextVersion,
        score,
        status: 'completed',
        feedback: feedback as object,
        contentSnapshot: essay.content,
        wordCount,
        creditsUsed: 10,
      },
    })

    await db.essay.update({
      where: { id },
      data: {
        status: EssayStatus.ANALYZED,
        latestScore: score,
        analysisCount: { increment: 1 },
      },
    })

    return NextResponse.json({
      analysis: {
        id: analysis.id,
        score,
        feedback,
        versionNumber: nextVersion,
        createdAt: analysis.createdAt,
      },
    })
  } catch (error) {
    console.error('Essay analysis error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
