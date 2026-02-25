import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { deductCreditsForFeature, refundCreditsForFeature } from '@/lib/credits/deduct'
import { InsufficientCreditsError } from '@/lib/credits/errors'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { wrapPromptWithLanguage } from '@/lib/ai-language'
import { AudioResponseStatus } from '../../../../../../../../../../prisma/generated/client'
import { Client } from '@replit/object-storage'
import { execFile } from 'child_process'
import { writeFile, readFile, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 120

const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

function needsConversion(filePath: string): boolean {
  return filePath.endsWith('.webm') || filePath.endsWith('.mp4') || filePath.endsWith('.m4a')
}

async function convertToWav(inputBuffer: Buffer, inputExt: string): Promise<Buffer> {
  const tmpId = randomUUID()
  const tmpInput = path.join('/tmp', `audio_in_${tmpId}.${inputExt}`)
  const tmpOutput = path.join('/tmp', `audio_out_${tmpId}.wav`)

  try {
    await writeFile(tmpInput, inputBuffer)

    await new Promise<void>((resolve, reject) => {
      execFile('ffmpeg', [
        '-i', tmpInput,
        '-ar', '16000',
        '-ac', '1',
        '-f', 'wav',
        '-y',
        tmpOutput,
      ], { timeout: 30000 }, (error, _stdout, stderr) => {
        if (error) {
          console.error('ffmpeg stderr:', stderr)
          reject(new Error(`ffmpeg conversion failed: ${error.message}`))
        } else {
          resolve()
        }
      })
    })

    return await readFile(tmpOutput)
  } finally {
    await unlink(tmpInput).catch(() => {})
    await unlink(tmpOutput).catch(() => {})
  }
}

async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
  promptText: string,
): Promise<string> {
  const audioBase64 = audioBuffer.toString('base64')
  const formatMap: Record<string, string> = {
    'audio/wav': 'wav', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
    'audio/ogg': 'ogg', 'audio/flac': 'flac', 'audio/aac': 'aac',
    'audio/mp4': 'aac', 'audio/webm': 'wav',
  }
  const format = formatMap[mimeType] || 'wav'
  console.log(`[Transcription] Sending audio: mimeType=${mimeType}, format=${format}, base64 length=${audioBase64.length}`)

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: audioBase64,
                format,
              },
            },
            {
              type: 'text',
              text: promptText,
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => 'unknown error')
    throw new Error(`OpenRouter transcription failed (${res.status}): ${errBody}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content?.trim() || ''
  console.log(`[Transcription] AI response (first 300 chars): ${content.substring(0, 300)}`)
  return content
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionIndex: string }> }
) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sessionId, questionIndex: qIdx } = await params
    const questionIndex = parseInt(qIdx, 10)

    if (isNaN(questionIndex) || questionIndex < 0) {
      return NextResponse.json({ error: 'Invalid question index' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { clerkId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const session = await db.audioInterviewSession.findFirst({
      where: { id: sessionId, userId: user.id },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const response = await db.audioInterviewResponse.findUnique({
      where: { sessionId_questionIndex: { sessionId, questionIndex } },
    })

    if (!response) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 })
    }

    if (response.status === 'PENDING') {
      return NextResponse.json({ error: 'No audio recorded yet' }, { status: 400 })
    }

    if (response.status === 'ANALYZING') {
      return NextResponse.json({ error: 'Analysis already in progress' }, { status: 409 })
    }

    let creditsDeducted = false
    const hasBeenAnalyzedBefore = response.score !== null || response.transcript !== null || response.status === 'ANALYZED'
    const isReanalysis = hasBeenAnalyzedBefore

    if (!isReanalysis) {
      try {
        await deductCreditsForFeature({
          clerkUserId: clerkId,
          feature: 'essay_analysis',
          details: { sessionId, questionIndex, action: 'audio_analysis' },
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
    }

    await db.audioInterviewResponse.update({
      where: { id: response.id },
      data: { status: AudioResponseStatus.ANALYZING },
    })

    let language: string | null = null
    try {
      const body = await request.json().catch(() => ({}))
      language = body?.language || null
    } catch { }

    const audioPath = response.audioPath
    if (!audioPath) {
      if (creditsDeducted) {
        await refundCreditsForFeature({
          clerkUserId: clerkId,
          feature: 'essay_analysis',
          quantity: 1,
          reason: 'audio_path_missing',
          details: { sessionId, questionIndex },
        }).catch(refundErr => console.error('Refund failed:', refundErr))
      }
      await db.audioInterviewResponse.update({
        where: { id: response.id },
        data: { status: AudioResponseStatus.RECORDED },
      }).catch(() => {})
      return NextResponse.json({ error: 'Audio file path not found' }, { status: 400 })
    }

    const bucketId = process.env.REPLIT_STORAGE_BUCKET_ID || process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || ''
    const storageClient = new Client({ bucketId })
    let audioBuffer: Buffer
    try {
      const result = await storageClient.downloadAsBytes(audioPath)
      if (!result.ok) {
        throw new Error(result.error?.message || 'Failed to download audio')
      }
      audioBuffer = result.value[0]
    } catch (downloadErr) {
      console.error('Audio download error:', downloadErr)
      if (creditsDeducted) {
        await refundCreditsForFeature({
          clerkUserId: clerkId,
          feature: 'essay_analysis',
          quantity: 1,
          reason: 'audio_download_failed',
          details: { sessionId, questionIndex },
        }).catch(refundErr => console.error('Refund failed:', refundErr))
      }
      await db.audioInterviewResponse.update({
        where: { id: response.id },
        data: { status: AudioResponseStatus.RECORDED },
      }).catch(() => {})
      return NextResponse.json({ error: 'Failed to download audio for analysis' }, { status: 500 })
    }

    let finalBuffer = audioBuffer
    let finalMimeType = 'audio/wav'

    if (needsConversion(audioPath)) {
      try {
        const ext = audioPath.split('.').pop() || 'webm'
        finalBuffer = await convertToWav(audioBuffer, ext)
        finalMimeType = 'audio/wav'
        console.log(`[Audio] Converted ${ext} to WAV (${finalBuffer.length} bytes)`)
      } catch (convErr) {
        console.error('[Audio] Conversion failed, using original:', convErr)
        finalMimeType = 'audio/webm'
      }
    } else {
      const ext = audioPath.split('.').pop() || 'mp3'
      const mimeMap: Record<string, string> = {
        wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg',
        flac: 'audio/flac', aac: 'audio/aac', m4a: 'audio/mp4',
      }
      finalMimeType = mimeMap[ext] || 'audio/wav'
    }

    let transcript: string
    let feedback: Record<string, unknown>

    try {
      const transcriptText = await transcribeAudio(
        finalBuffer,
        finalMimeType,
        wrapPromptWithLanguage(buildTranscriptionPrompt(), language),
      )

      const transcriptJson = transcriptText.match(/\{[\s\S]*\}/)
      if (transcriptJson) {
        const parsed = JSON.parse(transcriptJson[0])
        transcript = parsed.transcript || transcriptText
      } else {
        transcript = transcriptText
      }

      const analysisResult = await generateText({
        model: PROVIDER('google/gemini-2.0-flash-001'),
        prompt: wrapPromptWithLanguage(
          buildAnalysisPrompt(response.question, transcript),
          language
        ),
        temperature: 0.3,
        maxTokens: 4000,
      })

      const analysisText = analysisResult.text.trim()
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI analysis response is not valid JSON')
      }
      feedback = JSON.parse(jsonMatch[0])
    } catch (aiError) {
      console.error('AI audio analysis error:', aiError)

      if (creditsDeducted) {
        await refundCreditsForFeature({
          clerkUserId: clerkId,
          feature: 'essay_analysis',
          quantity: 1,
          reason: aiError instanceof Error ? aiError.message : 'ai_analysis_error',
          details: { sessionId, questionIndex },
        }).catch(refundErr => console.error('Refund failed:', refundErr))
      }

      await db.audioInterviewResponse.update({
        where: { id: response.id },
        data: { status: AudioResponseStatus.RECORDED },
      }).catch(updateErr => console.error('Status reset failed:', updateErr))

      return NextResponse.json({
        error: 'Erro na análise. Seus créditos foram reembolsados.',
      }, { status: 502 })
    }

    const score = typeof feedback.nota_geral === 'number' ? feedback.nota_geral : 5

    await db.audioInterviewResponse.update({
      where: { id: response.id },
      data: {
        transcript,
        status: AudioResponseStatus.ANALYZED,
        score,
        feedback: feedback as object,
        creditsUsed: isReanalysis ? 0 : 10,
      },
    })

    if (!isReanalysis) {
      const allResponses = await db.audioInterviewResponse.findMany({
        where: { sessionId },
      })
      const analyzedResponses = allResponses.filter(r => r.status === 'ANALYZED')
      const avgScore = analyzedResponses.length > 0
        ? analyzedResponses.reduce((sum, r) => sum + (r.score ?? 0), 0) / analyzedResponses.length
        : null

      await db.audioInterviewSession.update({
        where: { id: sessionId },
        data: {
          analyzedCount: analyzedResponses.length,
          averageScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      transcript,
      score,
      feedback,
    })
  } catch (error) {
    console.error('Audio analysis error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function buildTranscriptionPrompt(): string {
  return `Você é um transcritor profissional. Transcreva o áudio da resposta de entrevista que foi fornecido.

IMPORTANTE:
- Transcreva palavra por palavra, incluindo hesitações (hm, uh, etc.)
- Mantenha a pontuação natural do discurso falado
- Identifique pausas longas com [pausa]
- Não corrija erros gramaticais do falante
- Se o áudio estiver vazio ou inaudível, retorne transcript vazio

FORMATO DE RESPOSTA (JSON):
{
  "transcript": "Transcrição completa do áudio aqui..."
}

Responda APENAS com o JSON.`
}

function buildAnalysisPrompt(question: string, transcript: string): string {
  return `Você é um especialista em preparação para entrevistas Chevening com mais de 10 anos de experiência avaliando candidatos. Analise a resposta oral do candidato à seguinte pergunta de entrevista.

PERGUNTA DA ENTREVISTA:
"${question}"

TRANSCRIÇÃO DA RESPOSTA ORAL DO CANDIDATO:
"""
${transcript}
"""

CRITÉRIOS DE AVALIAÇÃO PARA RESPOSTA ORAL:
1. Clareza e Estrutura (1-10): Organização lógica, estrutura STAR, clareza de expressão
2. Conteúdo e Relevância (1-10): Relevância à pergunta, exemplos concretos, profundidade
3. Fluência Verbal (1-10): Fluidez, vocabulário, pausas excessivas, palavras de preenchimento
4. Confiança e Presença (1-10): Tom de voz inferido, assertividade, convicção
5. Exemplos e Evidências (1-10): Uso de dados, métricas, histórias reais
6. Alinhamento Chevening (1-10): Demonstração de liderança, networking, UK study relevance

INSTRUÇÕES:
1. Avalie cada critério de 1 a 10
2. Identifique pontos fortes específicos com citações da transcrição
3. Liste pontos de melhoria priorizados
4. Forneça uma resposta modelo (como deveria responder idealmente)
5. Verifique uso do método STAR

FORMATO DE RESPOSTA (JSON estrito):
{
  "nota_geral": <number 1-10>,
  "status": "<COMPETITIVO|REQUER_MELHORIAS|CRITICO>",
  "criterios": [
    {
      "nome": "<nome do critério>",
      "nota": <number 1-10>,
      "justificativa": "<análise detalhada>"
    }
  ],
  "pontos_fortes": [
    {
      "titulo": "<título>",
      "descricao": "<descrição>",
      "citacao": "<trecho da transcrição>"
    }
  ],
  "pontos_melhoria": [
    {
      "prioridade": "<CRITICO|IMPORTANTE|RECOMENDADO>",
      "problema": "<descrição>",
      "recomendacao": "<o que fazer>",
      "impacto_esperado": "<como melhora a resposta>"
    }
  ],
  "resposta_modelo": "<como o candidato deveria responder idealmente, usando STAR>",
  "dicas_comunicacao": [
    "<dica específica sobre como melhorar a comunicação oral>"
  ],
  "comentario_final": {
    "sintese": "<resumo geral>",
    "top_3_prioridades": ["<prioridade 1>", "<prioridade 2>", "<prioridade 3>"],
    "nivel_prontidao": "<BAIXO|MEDIO|ALTO>"
  }
}

Responda APENAS com o JSON, sem markdown, sem código de bloco, sem texto adicional.`
}
