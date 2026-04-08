import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_CONTENT_CHARS = 50000

function toResumeTitle(fileName: string): string {
  const noExt = fileName.replace(/\.[^/.]+$/, '')
  const cleaned = noExt.replace(/[_-]+/g, ' ').trim()
  return cleaned || 'My Resume'
}

function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

  // Point the worker to the actual file on disk using an absolute path.
  // Using path.join + process.cwd() avoids Turbopack's require.resolve issues.
  const workerPath = path.join(
    process.cwd(),
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.mjs'
  )
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString()

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) })
  const pdf = await loadingTask.promise

  try {
    const pageTexts: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      const text = textContent.items
        .map((item) => ('str' in item ? String(item.str) : ''))
        .join(' ')
        .trim()

      if (text) pageTexts.push(text)
      page.cleanup()
    }

    return pageTexts.join('\n\n')
  } finally {
    await pdf.destroy()
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = (await import('mammoth')).default
  const parsed = await mammoth.extractRawText({ buffer })
  return parsed.value || ''
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 413 }
      )
    }

    const fileName = file.name || 'resume'
    const extension = fileName.split('.').pop()?.toLowerCase() || ''

    if (extension !== 'pdf' && extension !== 'docx') {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF or DOCX file.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText = ''

    if (extension === 'pdf') {
      try {
        extractedText = await extractPdfText(buffer)
      } catch (error) {
        const details = error instanceof Error ? error.message : 'Unknown PDF parser error'
        return NextResponse.json(
          {
            error:
              'Could not read this PDF. The file may be image-only or corrupted.',
            details,
          },
          { status: 400 }
        )
      }
    } else {
      try {
        extractedText = await extractDocxText(buffer)
      } catch (error) {
        const details = error instanceof Error ? error.message : 'Unknown DOCX parser error'
        return NextResponse.json(
          {
            error: 'Could not read this DOCX file. Please verify the file format.',
            details,
          },
          { status: 400 }
        )
      }
    }

    const normalized = normalizeText(extractedText)
    if (!normalized) {
      return NextResponse.json(
        {
          error:
            'No readable text found in this file. If it is a scanned CV, use OCR first.',
        },
        { status: 400 }
      )
    }

    const content = normalized.slice(0, MAX_CONTENT_CHARS)
    const truncated = normalized.length > MAX_CONTENT_CHARS

    return NextResponse.json({
      title: toResumeTitle(fileName),
      content,
      truncated,
      originalLength: normalized.length,
    })
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error extracting resume text:', error)
    return NextResponse.json(
      { error: 'Failed to extract text from file.', details },
      { status: 500 }
    )
  }
}
