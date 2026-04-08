import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { z } from 'zod'

const RequestSchema = z.object({
  url: z.string().url('Please provide a valid URL'),
})

const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const CRAWL_MODEL = process.env.AI_MODEL ?? 'google/gemini-2.0-flash-001'

const MAX_CHARS = 80_000
const FETCH_TIMEOUT_MS = 15_000

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|section|article|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; JobBot/1.0; +https://standout.app)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!response.ok) {
      throw new Error(`Page returned status ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new Error('URL does not point to a readable web page')
    }

    const html = await response.text()
    return stripHtml(html).slice(0, MAX_CHARS)
  } finally {
    clearTimeout(timeoutId)
  }
}

interface ExtractedJob {
  jobTitle: string
  companyName: string
  jobDescription: string
}

async function extractJobData(pageText: string, sourceUrl: string): Promise<ExtractedJob> {
  const prompt = `You are a job posting parser. Extract structured job information from the following web page text.

SOURCE URL: ${sourceUrl}

PAGE TEXT:
${pageText}

---

Return ONLY a valid JSON object with exactly these fields:
{
  "jobTitle": "the exact job title/position name",
  "companyName": "the company or organisation name",
  "jobDescription": "the full job description as plain text, preserving all requirements, responsibilities, qualifications and benefits — do not truncate"
}

Rules:
- If a field cannot be determined, use an empty string ""
- Do NOT include any explanation, markdown fences, or extra text — only the JSON object
- The jobDescription should be the raw posting content, not a summary`

  const { text } = await generateText({
    model: PROVIDER(CRAWL_MODEL),
    prompt,
  })

  const cleaned = text.trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('AI could not extract job data from this page')
  }

  const parsed = JSON.parse(match[0]) as Record<string, unknown>

  return {
    jobTitle: typeof parsed.jobTitle === 'string' ? parsed.jobTitle : '',
    companyName: typeof parsed.companyName === 'string' ? parsed.companyName : '',
    jobDescription: typeof parsed.jobDescription === 'string' ? parsed.jobDescription : '',
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid URL' },
        { status: 400 }
      )
    }

    const { url } = parsed.data

    let pageText: string
    try {
      pageText = await fetchPageText(url)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch page'

      if (message.includes('abort') || message.includes('timeout')) {
        return NextResponse.json(
          { error: 'The page took too long to respond. Try pasting the description manually.' },
          { status: 408 }
        )
      }

      return NextResponse.json(
        { error: `Could not access this URL: ${message}` },
        { status: 422 }
      )
    }

    if (pageText.length < 100) {
      return NextResponse.json(
        { error: 'The page does not appear to contain readable content.' },
        { status: 422 }
      )
    }

    let extracted: ExtractedJob
    try {
      extracted = await extractJobData(pageText, url)
    } catch (err) {
      console.error('[crawl] AI extraction error:', err)
      return NextResponse.json(
        { error: 'Could not extract job information from this page. Try pasting the description manually.' },
        { status: 422 }
      )
    }

    if (!extracted.jobDescription.trim()) {
      return NextResponse.json(
        { error: 'No job description found on this page. Make sure the URL points to a public job posting.' },
        { status: 422 }
      )
    }

    return NextResponse.json({ extracted })
  } catch (error) {
    console.error('[crawl] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
