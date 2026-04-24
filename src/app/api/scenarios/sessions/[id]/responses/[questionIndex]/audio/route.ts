import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { Storage } from '@google-cloud/storage'

export const runtime = 'nodejs'

function getMimeType(path: string): string {
  if (path.endsWith('.webm')) return 'audio/webm'
  if (path.endsWith('.mp4') || path.endsWith('.m4a')) return 'audio/mp4'
  if (path.endsWith('.ogg')) return 'audio/ogg'
  if (path.endsWith('.wav')) return 'audio/wav'
  return 'audio/mpeg'
}

export async function GET(
  _request: NextRequest,
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

    if (!response || !response.audioPath) {
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 })
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
    const [buffer] = await gcs.bucket(bucketId).file(response.audioPath).download()

    const contentType = getMimeType(response.audioPath)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Audio stream error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
