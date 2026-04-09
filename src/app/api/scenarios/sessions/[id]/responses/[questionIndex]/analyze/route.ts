import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { deductCreditsForFeature, refundCreditsForFeature } from '@/lib/credits/deduct'
import { InsufficientCreditsError } from '@/lib/credits/errors'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { wrapPromptWithLanguage } from '@/lib/ai-language'
import { ScenarioResponseStatus } from '@/lib/prisma-types'
import { Storage } from '@google-cloud/storage'
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

    const session = await db.workplaceScenarioSession.findFirst({
      where: { id: sessionId, userId: user.id },
      include: {
        jobApplication: {
          select: {
            jobTitle: true,
            companyName: true,
            jobDescription: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const response = await db.workplaceScenarioResponse.findUnique({
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
          feature: 'scenario_simulation',
          details: { sessionId, questionIndex, action: 'scenario_analysis' },
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
    }

    await db.workplaceScenarioResponse.update({
      where: { id: response.id },
      data: { status: ScenarioResponseStatus.ANALYZING },
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
          feature: 'scenario_simulation',
          quantity: 1,
          reason: 'audio_path_missing',
          details: { sessionId, questionIndex },
        }).catch(refundErr => console.error('Refund failed:', refundErr))
      }
      await db.workplaceScenarioResponse.update({
        where: { id: response.id },
        data: { status: ScenarioResponseStatus.RECORDED },
      }).catch(() => {})
      return NextResponse.json({ error: 'Audio file path not found' }, { status: 400 })
    }

    const bucketId = process.env.REPLIT_STORAGE_BUCKET_ID || process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || ''
    const REPLIT_ADC = {
      audience: 'replit',
      subject_token_type: 'access_token',
      token_url: 'http://127.0.0.1:1106/token',
      type: 'external_account',
      credential_source: {
        url: 'http://127.0.0.1:1106/credential',
        format: { type: 'json', subject_token_field_name: 'access_token' },
      },
      universe_domain: 'googleapis.com',
    }
    const gcs = new Storage({ credentials: REPLIT_ADC, projectId: '' })
    const bucket = gcs.bucket(bucketId)
    let audioBuffer: Buffer
    try {
      const [contents] = await bucket.file(audioPath).download()
      audioBuffer = contents
    } catch (downloadErr) {
      console.error('Audio download error:', downloadErr)
      if (creditsDeducted) {
        await refundCreditsForFeature({
          clerkUserId: clerkId,
          feature: 'scenario_simulation',
          quantity: 1,
          reason: 'audio_download_failed',
          details: { sessionId, questionIndex },
        }).catch(refundErr => console.error('Refund failed:', refundErr))
      }
      await db.workplaceScenarioResponse.update({
        where: { id: response.id },
        data: { status: ScenarioResponseStatus.RECORDED },
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
          buildAnalysisPrompt(response.prompt, transcript, session.scenarioType, user, session.jobApplication),
          language
        ),
        temperature: 0.3,
        maxOutputTokens: 4000,
      })

      const analysisText = analysisResult.text.trim()
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('AI analysis response is not valid JSON')
      }
      feedback = JSON.parse(jsonMatch[0])
    } catch (aiError) {
      console.error('AI scenario analysis error:', aiError)

      if (creditsDeducted) {
        await refundCreditsForFeature({
          clerkUserId: clerkId,
          feature: 'scenario_simulation',
          quantity: 1,
          reason: aiError instanceof Error ? aiError.message : 'ai_analysis_error',
          details: { sessionId, questionIndex },
        }).catch(refundErr => console.error('Refund failed:', refundErr))
      }

      await db.workplaceScenarioResponse.update({
        where: { id: response.id },
        data: { status: ScenarioResponseStatus.RECORDED },
      }).catch(updateErr => console.error('Status reset failed:', updateErr))

      return NextResponse.json({
        error: 'Analysis error. Your credits have been refunded.',
      }, { status: 502 })
    }

    const score = typeof feedback.overall_score === 'number' ? feedback.overall_score
      : typeof feedback.nota_geral === 'number' ? feedback.nota_geral : 5

    await db.workplaceScenarioResponse.update({
      where: { id: response.id },
      data: {
        transcript,
        status: ScenarioResponseStatus.ANALYZED,
        score,
        feedback: feedback as object,
        creditsUsed: isReanalysis ? 0 : 15,
      },
    })

    if (!isReanalysis) {
      const allResponses = await db.workplaceScenarioResponse.findMany({
        where: { sessionId },
      })
      const analyzedResponses = allResponses.filter(r => r.status === 'ANALYZED')
      const avgScore = analyzedResponses.length > 0
        ? analyzedResponses.reduce((sum, r) => sum + (r.score ?? 0), 0) / analyzedResponses.length
        : null

      await db.workplaceScenarioSession.update({
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
    console.error('Scenario analysis error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

function buildTranscriptionPrompt(): string {
  return `You are a professional transcriber. Transcribe the audio response from a workplace scenario practice session.

IMPORTANT:
- Transcribe word for word, including hesitations (um, uh, etc.)
- Maintain natural speech punctuation
- Mark long pauses with [pause]
- Do not correct the speaker's grammatical errors
- If the audio is empty or inaudible, return an empty transcript

RESPONSE FORMAT (JSON):
{
  "transcript": "Full transcription of the audio here..."
}

Respond ONLY with the JSON.`
}

function buildAnalysisPrompt(
  scenarioPrompt: string,
  transcript: string,
  scenarioType: string | null,
  user: { industry?: string | null; currentRole?: string | null; englishLevel?: string | null },
  jobApplication?: { jobTitle?: string | null; companyName?: string | null; jobDescription?: string } | null,
): string {
  const userContext = [
    user.industry ? `Industry: ${user.industry}` : null,
    user.currentRole ? `Role: ${user.currentRole}` : null,
    user.englishLevel ? `English Level: ${user.englishLevel}` : null,
  ].filter(Boolean).join(', ')

  const jobContext = jobApplication
    ? `\nJOB CONTEXT:\nPosition: ${jobApplication.jobTitle || 'Not specified'}\nCompany: ${jobApplication.companyName || 'Not specified'}\nJob Description (excerpt): ${(jobApplication.jobDescription || '').slice(0, 600)}\n`
    : ''

  return `You are an expert interview coach and Business English specialist. Analyze the candidate's spoken response to the following job interview question.

INTERVIEW QUESTION:
"${scenarioPrompt}"
${jobContext}
${userContext ? `CANDIDATE CONTEXT: ${userContext}\n` : ''}
TRANSCRIPTION OF THE CANDIDATE'S SPOKEN RESPONSE:
"""
${transcript}
"""

EVALUATION CRITERIA FOR INTERVIEW PERFORMANCE:
1. Answer Relevance & Completeness (1-10): Did they address what was asked? Covered all key aspects?
2. Communication Clarity (1-10): Clear expression, logical structure, conciseness
3. STAR Method / Structure (1-10): Situation→Task→Action→Result — concrete examples vs vague generalities
4. Business English Proficiency (1-10): Grammar, vocabulary range, professional register
5. Confidence and Fluency (1-10): Natural flow, minimal hesitation, assertive delivery
6. Job Fit Demonstration (1-10): Did their response show they are right for this specific role?

INSTRUCTIONS:
1. Evaluate each criterion from 1 to 10
2. Identify specific strengths with quotes from the transcript
3. List prioritized improvement areas
4. Provide a model response (how they should ideally respond)
5. Check for common Business English mistakes
6. CRITICAL: Annotate the transcript with word-level feedback. For each annotation, provide the EXACT text from the transcript that should be highlighted, the type of annotation, and a short comment. This is the most important part of the analysis.

ANNOTATION TYPES:
- "grammar_error": Grammatical mistakes (wrong tense, subject-verb disagreement, missing articles, etc.)
- "vocabulary": Vocabulary issues or suggestions for better/more professional word choice
- "good_usage": Excellent word choice, professional phrasing, or strong business English
- "filler": Filler words and hesitations (um, uh, like, you know, etc.)
- "structure": Sentence structure issues (run-on sentences, awkward phrasing, unclear meaning)
- "pronunciation_hint": Words that are commonly mispronounced (inferred from transcript patterns)

ANNOTATION RULES:
- The "text" field must be an EXACT substring from the transcript (case-sensitive match)
- If the same text appears multiple times, annotate the first occurrence
- Provide 5-20 annotations covering a mix of errors AND good usage
- Keep comments concise (under 15 words)
- For grammar_error and vocabulary types, include a "suggestion" field with the corrected text
- Annotations should cover the full transcript, not just the beginning

RESPONSE FORMAT (strict JSON):
{
  "overall_score": <number 1-10>,
  "status": "<STRONG|NEEDS_IMPROVEMENT|CRITICAL>",
  "transcript_annotations": [
    {
      "text": "<exact substring from transcript>",
      "type": "<grammar_error|vocabulary|good_usage|filler|structure|pronunciation_hint>",
      "comment": "<short explanation>",
      "suggestion": "<corrected/improved text or null>"
    }
  ],
  "criteria": [
    {
      "name": "<criterion name>",
      "score": <number 1-10>,
      "justification": "<detailed analysis>"
    }
  ],
  "strengths": [
    {
      "title": "<title>",
      "description": "<description>",
      "quote": "<quote from transcript>"
    }
  ],
  "improvements": [
    {
      "priority": "<CRITICAL|IMPORTANT|RECOMMENDED>",
      "issue": "<description>",
      "recommendation": "<what to do>",
      "expected_impact": "<how it improves the response>"
    }
  ],
  "model_response": "<how the user should ideally respond in this scenario>",
  "communication_tips": [
    "<specific tip about improving workplace communication>"
  ],
  "final_comment": {
    "summary": "<overall summary>",
    "top_3_priorities": ["<priority 1>", "<priority 2>", "<priority 3>"],
    "readiness_level": "<LOW|MEDIUM|HIGH>"
  }
}

Respond ONLY with the JSON, no markdown, no code blocks, no additional text.`
}
