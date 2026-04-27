import { NextResponse } from 'next/server'
import { routeToSkill } from '@/lib/agents/orchestrator'
import { AgentSkill, type UserContext } from '@/lib/agents/types'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

function parseAnalysisJson(analysisContent: string): Record<string, unknown> {
  try {
    const cleaned = analysisContent.trim()
    const jsonMatch = cleaned.match(new RegExp("\\{[\\s\\S]*\\}"))
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>
    }
    return JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    console.error("Failed to parse AI response as JSON, raw:", analysisContent.slice(0, 500))
    return {}
  }
}

function toJsonArray(val: unknown): string[] | null {
  if (Array.isArray(val) && val.length > 0) return val.map(String)
  return null
}

export async function POST(request: Request) {
  try {
    const { resumeText, jobDescription } = await request.json()

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: 'Resume text and job description are required.' },
        { status: 400 }
      )
    }

    // TODO: Add simple IP rate-limiting here if needed.

    const userContext: UserContext = {
      resumeText,
      jobDescriptionText: jobDescription,
    }

    const { systemMessage, userPrompt } = await routeToSkill(
      "Analyze my resume against this job description. Provide a detailed match analysis with fit score, matching skills, missing skills, strengths, and improvement recommendations.",
      userContext,
      { skill: AgentSkill.APPLICATION_OPTIMIZER }
    )

    const model = PROVIDER(process.env.AI_MODEL || "google/gemini-2.0-flash-001")

    const { text: analysisContent } = await generateText({
      model,
      system: systemMessage,
      prompt:
        userPrompt +
        "\n\nRespond ONLY with valid JSON. No markdown, no code fences, no explanations outside the JSON.",
      temperature: 0.7,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'guest-analysis',
      },
    })

    const analysisResult = parseAnalysisJson(analysisContent)

    // Standardize to match ApplicationAnalysis model structure
    const analysisPayload = {
      fitScore:
        typeof analysisResult.fitScore === "number"
          ? analysisResult.fitScore
          : typeof analysisResult.fitScore === "string"
            ? parseFloat(analysisResult.fitScore) || null
            : null,
      summary: typeof analysisResult.summary === "string" ? analysisResult.summary : null,
      skillsMatch: toJsonArray(analysisResult.skillsMatch || analysisResult.matchingSkills),
      missingSkills: toJsonArray(analysisResult.missingSkills),
      strengths: toJsonArray(analysisResult.strengths),
      improvements: toJsonArray(analysisResult.improvements || analysisResult.improvementAreas),
      recommendations: toJsonArray(analysisResult.recommendations),
      keywordAnalysis:
        analysisResult.keywordAnalysis && typeof analysisResult.keywordAnalysis === "object"
          ? analysisResult.keywordAnalysis
          : null,
    }

    return NextResponse.json({
      success: true,
      analysis: analysisPayload,
      originalInput: {
        resumeText,
        jobDescription,
      }
    })
  } catch (error) {
    console.error('Error in guest analysis:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
