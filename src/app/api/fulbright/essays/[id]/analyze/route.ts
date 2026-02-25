import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { EssayStatus } from '../../../../../../../prisma/generated/client'
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
  GRANT_PURPOSE: 'Statement of Grant Purpose',
  PERSONAL_STATEMENT: 'Personal Statement',
}

const CATEGORY_LABELS: Record<string, string> = {
  STUDENT: 'Estudante/Graduado',
  YOUNG_PROFESSIONAL: 'Profissional Jovem',
  RESEARCHER: 'Pesquisador/Scholar',
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function buildFulbrightPrompt(
  essayType: string,
  content: string,
  wordCount: number,
  category?: string | null,
  hostInstitution?: string | null,
  previousFeedback?: string,
  language?: string | null
): string {
  const typeLabel = ESSAY_TYPE_LABELS[essayType] || essayType
  const categoryLabel = category ? CATEGORY_LABELS[category] || category : 'Não especificada'

  let context = ''
  if (previousFeedback) {
    context = `
CONTEXTO DE REANÁLISE:
Este essay já foi analisado anteriormente. O feedback anterior foi:
${previousFeedback}
Verifique se as recomendações prioritárias foram implementadas e destaque a evolução.
`
  }

  let hostContext = ''
  if (hostInstitution) {
    hostContext = `- Host Institution: ${hostInstitution}\n`
  }

  return `Você é um avaliador especialista em bolsas Fulbright (Programa de Bolsas de Estudo do Governo dos EUA) com mais de 10 anos de experiência avaliando candidaturas. Sua tarefa é avaliar o essay "${typeLabel}" de um candidato à bolsa Fulbright.

INFORMAÇÕES DO ESSAY:
- Tipo: ${typeLabel}
- Categoria do candidato: ${categoryLabel}
- Contagem de palavras: ${wordCount}/1000
${hostContext}${context}

TEXTO DO ESSAY:
"""
${content}
"""

CRITÉRIOS DE AVALIAÇÃO ESPECÍFICOS:

${getFulbrightCriteria(essayType, category, language)}

INSTRUÇÕES DE AVALIAÇÃO:
1. Avalie cada um dos 6 critérios de 1 a 10
2. Identifique pontos fortes específicos com citações do texto
3. Liste pontos de melhoria priorizados (crítico, importante, recomendado)
4. Forneça sugestões concretas de reescrita com comparação antes/depois
5. Avalie o "ambassadorial potential" do candidato
6. Verifique alinhamento com valores Fulbright: "mutual understanding between peoples"
7. Analise a viabilidade do projeto proposto (especialmente para Grant Purpose)
8. Considere a categoria do candidato (${categoryLabel}) nos critérios de avaliação

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
  "viabilidade_projeto": {
    "avaliacao": "<análise da viabilidade do projeto proposto>",
    "compatibilidade_host": "<análise de compatibilidade com host institution, se informada>",
    "alertas": ["<alertas sobre realisticidade>"]
  },
  "alertas_criticos": [
    "<alerta se aplicável, ex: limite de palavras, tom inadequado, sobreposição com outro essay>"
  ],
  "comentario_final": {
    "sintese": "<resumo geral da avaliação>",
    "top_3_prioridades": ["<prioridade 1>", "<prioridade 2>", "<prioridade 3>"],
    "probabilidade_aprovacao": "<BAIXA|MEDIA|ALTA>",
    "readiness_entrevista": "<avaliação do preparo para entrevista Fulbright>"
  }
}

Responda APENAS com o JSON, sem markdown, sem código de bloco, sem texto adicional.`
}

function getFulbrightCriteria(essayType: string, category?: string | null, language?: string | null): string {
  const isEnglish = language?.startsWith('en')

  const categorySpecific = isEnglish
    ? (category === 'RESEARCHER'
      ? 'Additional weight: methodological rigor, contribution to the field, publications/research experience.'
      : category === 'YOUNG_PROFESSIONAL'
        ? 'Additional weight: relevant professional experience, sector leadership potential, community impact.'
        : 'Additional weight: academic potential, motivation for field of study, intellectual growth.')
    : (category === 'RESEARCHER'
      ? 'Peso adicional: rigor metodológico, contribuição para o campo, publicações/experiência de pesquisa.'
      : category === 'YOUNG_PROFESSIONAL'
        ? 'Peso adicional: experiência profissional relevante, potencial de liderança setorial, impacto comunitário.'
        : 'Peso adicional: potencial acadêmico, motivação para área de estudo, crescimento intelectual.')

  if (essayType === 'GRANT_PURPOSE') {
    return isEnglish
      ? `For STATEMENT OF GRANT PURPOSE, evaluate the 6 criteria:

1. PROJECT CLARITY (clareza_projeto): Grant/study objectives clearly articulated, defined scope, methodology described
2. FEASIBILITY (viabilidade): Project is achievable within Fulbright period, required resources identified, realistic timeline
3. ACADEMIC/PROFESSIONAL PREPARATION (preparo_academico): Background supporting ability to execute project, relevant qualifications
4. INTERCULTURAL IMPACT (impacto_intercultural): Contribution to "mutual understanding", ambassadorial potential, bridge between cultures
5. ADAPTABILITY (adaptabilidade): Demonstrated ability to adapt to new environments, resilience, cultural openness
6. PERSUASIVE WRITING (escrita_persuasiva): Quality of argumentation, clarity, engagement, cohesive narrative structure

${categorySpecific}

Special attention:
- Grant Purpose should focus on PROJECT/OBJECTIVES academic or professional
- Should NOT be overly personal (that's for the Personal Statement)
- Must demonstrate WHY the US is essential for this project
- If host institution was mentioned, evaluate compatibility`
      : `Para STATEMENT OF GRANT PURPOSE, avalie os 6 critérios:

1. CLAREZA DO PROJETO (clareza_projeto): Objetivos do grant/estudo claramente articulados, escopo definido, metodologia descrita
2. VIABILIDADE (viabilidade): Projeto é realizável no período Fulbright, recursos necessários identificados, timeline realista
3. PREPARO ACADÊMICO/PROFISSIONAL (preparo_academico): Background que sustenta capacidade de executar o projeto, qualificações relevantes
4. IMPACTO INTERCULTURAL (impacto_intercultural): Contribuição para "mutual understanding", potencial ambassadorial, ponte entre culturas
5. ADAPTABILIDADE (adaptabilidade): Capacidade demonstrada de adaptação a ambientes novos, resiliência, abertura cultural
6. ESCRITA PERSUASIVA (escrita_persuasiva): Qualidade da argumentação, clareza, engajamento, estrutura narrativa coesa

${categorySpecific}

Atenção especial:
- O Grant Purpose deve focar no PROJETO/OBJETIVOS acadêmicos ou profissionais
- NÃO deve ser excessivamente pessoal (isso é para o Personal Statement)
- Deve demonstrar POR QUE os EUA são essenciais para este projeto
- Se host institution foi mencionada, avaliar compatibilidade`
  }

  return isEnglish
    ? `For PERSONAL STATEMENT, evaluate the 6 criteria:

1. PROJECT CLARITY (clareza_projeto): Clear personal narrative, well-articulated motivations, connection to Fulbright objectives
2. FEASIBILITY (viabilidade): Experiences demonstrating ability to complete the program, personal maturity
3. ACADEMIC/PROFESSIONAL PREPARATION (preparo_academico): Personal and academic background enriching the application
4. INTERCULTURAL IMPACT (impacto_intercultural): Cross-cultural experiences, contribution to "mutual understanding", cultural ambassador vision
5. ADAPTABILITY (adaptabilidade): Concrete examples of adaptation, overcoming challenges, personal growth
6. PERSUASIVE WRITING (escrita_persuasiva): Authenticity, distinct personal voice, engaging narrative, no clichés

${categorySpecific}

Special attention:
- Personal Statement should focus on the PERSON, not the project
- Should NOT repeat Grant Purpose content
- Should reveal who the candidate is beyond the CV
- Must demonstrate "ambassadorial potential" and cultural sensitivity
- Formative experiences that shaped worldview`
    : `Para PERSONAL STATEMENT, avalie os 6 critérios:

1. CLAREZA DO PROJETO (clareza_projeto): Narrativa pessoal clara, motivações bem articuladas, conexão com objetivos Fulbright
2. VIABILIDADE (viabilidade): Experiências que demonstram capacidade de completar o programa, maturidade pessoal
3. PREPARO ACADÊMICO/PROFISSIONAL (preparo_academico): Background pessoal e acadêmico que enriquece a candidatura
4. IMPACTO INTERCULTURAL (impacto_intercultural): Experiências interculturais, contribuição para "mutual understanding", visão de embaixador cultural
5. ADAPTABILIDADE (adaptabilidade): Exemplos concretos de adaptação, superação de desafios, crescimento pessoal
6. ESCRITA PERSUASIVA (escrita_persuasiva): Autenticidade, voz pessoal distinta, narrativa envolvente, sem clichês

${categorySpecific}

Atenção especial:
- O Personal Statement deve focar na PESSOA, não no projeto
- NÃO deve repetir conteúdo do Grant Purpose
- Deve revelar quem o candidato é além do CV
- Deve demonstrar "ambassadorial potential" e sensibilidade cultural
- Experiências formativas que moldaram visão de mundo`
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
      where: { id, userId: user.id, scholarship: 'fulbright' },
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
    if (wordCount < 50) {
      return NextResponse.json({ error: 'Texto muito curto. Mínimo de 50 palavras.' }, { status: 400 })
    }
    if (wordCount > 1000) {
      return NextResponse.json({ error: `Texto excede o limite. ${wordCount}/1000 palavras.` }, { status: 400 })
    }

    let creditsDeducted = false

    try {
      await deductCreditsForFeature({
        clerkUserId: clerkId,
        feature: 'essay_analysis',
        details: { essayId: id, essayType: essay.type, scholarship: 'fulbright' },
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

    const basePrompt = buildFulbrightPrompt(
      essay.type,
      essay.content,
      wordCount,
      essay.fulbrightCategory,
      essay.hostInstitution,
      previousFeedbackSummary,
      language
    )
    const prompt = wrapPromptWithLanguage(basePrompt, language)

    let feedback: Record<string, unknown>
    try {
      const result = await generateText({
        model: PROVIDER('google/gemini-2.0-flash-001'),
        prompt,
        temperature: 0.3,
        maxTokens: 5000,
      })

      const text = result.text.trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI response is not valid JSON')
      }
      feedback = JSON.parse(jsonMatch[0])
    } catch (aiError) {
      console.error('AI analysis error (Fulbright):', aiError)

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
    console.error('Fulbright essay analysis error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
