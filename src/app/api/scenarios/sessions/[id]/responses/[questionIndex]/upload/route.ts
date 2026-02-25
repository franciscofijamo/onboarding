import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { getStorageProvider } from '@/lib/storage'
import { ScenarioResponseStatus } from '@/lib/prisma-types'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_AUDIO_SIZE = 25 * 1024 * 1024

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
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const response = await db.workplaceScenarioResponse.findUnique({
      where: { sessionId_questionIndex: { sessionId, questionIndex } },
    })

    if (!response) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const durationStr = formData.get('duration') as string | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: 'Audio file too large. Max 25MB.' }, { status: 400 })
    }

    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/mp3']
    if (!allowedTypes.some(t => audioFile.type.startsWith(t.split('/')[0]))) {
      return NextResponse.json({ error: 'Invalid audio format' }, { status: 400 })
    }

    const ext = audioFile.type.includes('webm') ? 'webm'
      : audioFile.type.includes('mp4') || audioFile.type.includes('m4a') ? 'mp4'
      : audioFile.type.includes('ogg') ? 'ogg'
      : audioFile.type.includes('wav') ? 'wav'
      : 'mp3'

    const key = `workplace-scenarios/${user.id}/${sessionId}/q${questionIndex}.${ext}`

    const storage = getStorageProvider()
    const uploadResult = await storage.upload(key, audioFile, { access: 'private' })

    const duration = durationStr ? parseInt(durationStr, 10) : null

    const isNewRecording = response.status === 'PENDING'

    const wasAnalyzed = response.status === 'ANALYZED' || response.score !== null

    await db.workplaceScenarioResponse.update({
      where: { id: response.id },
      data: {
        audioUrl: uploadResult.url,
        audioPath: uploadResult.pathname,
        duration: duration || null,
        status: ScenarioResponseStatus.RECORDED,
        transcript: null,
        feedback: null,
        ...(wasAnalyzed ? {} : { score: null }),
      },
    })

    if (isNewRecording) {
      await db.workplaceScenarioSession.update({
        where: { id: sessionId },
        data: { answeredCount: { increment: 1 } },
      })
    }

    return NextResponse.json({
      success: true,
      audioUrl: uploadResult.url,
      duration,
    })
  } catch (error) {
    console.error('Audio upload error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
