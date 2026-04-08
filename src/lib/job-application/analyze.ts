import { createHash } from "crypto"
import { db } from "@/lib/db"
import { deductCreditsForFeature } from "@/lib/credits/deduct"
import { routeToSkill } from "@/lib/agents/orchestrator"
import { AgentSkill, type UserContext } from "@/lib/agents/types"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000
const inFlightByKey = new Map<string, Promise<unknown>>()
const recentResultByKey = new Map<string, { expiresAt: number; value: unknown }>()

function toJsonArray(val: unknown): string[] | null {
  if (Array.isArray(val) && val.length > 0) return val.map(String)
  return null
}

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

function getInputHash(payload: {
  resumeText: string
  coverLetterText?: string
  jobDescription: string
  jobTitle?: string
  companyName?: string
  companyInfo?: string
}) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

function withInputHash(rawResponse: string, hash: string) {
  return "__INPUT_HASH__:" + hash + "\n" + rawResponse
}

function extractInputHash(rawResponse?: string | null): string | null {
  if (rawResponse == null) return null
  const match = rawResponse.match(new RegExp("^__INPUT_HASH__:(.+)$", "m"))
  return match?.[1]?.trim() || null
}

export class AnalysisInProgressError extends Error {
  constructor() {
    super("Analysis already in progress")
    this.name = "AnalysisInProgressError"
  }
}

async function runAnalysisCore(params: {
  clerkId: string
  userId: string
  jobApplicationId: string
}) {
  const { clerkId, userId, jobApplicationId } = params

  const lock = await db.jobApplication.updateMany({
    where: { id: jobApplicationId, userId, status: { not: "ANALYZING" } },
    data: { status: "ANALYZING" },
  })

  if (lock.count === 0) {
    throw new AnalysisInProgressError()
  }

  try {
    const jobApplication = await db.jobApplication.findFirst({
      where: { id: jobApplicationId, userId },
      include: {
        resume: true,
        coverLetter: true,
        user: true,
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (jobApplication == null) {
      throw new Error("Job application not found")
    }

    if ((jobApplication.resume?.content || "").trim() === "") {
      throw new Error("Resume content is required to run analysis")
    }

    if ((jobApplication.jobDescription || "").trim() === "") {
      throw new Error("Job description is required to run analysis")
    }

    const inputHash = getInputHash({
      resumeText: jobApplication.resume?.content || "",
      coverLetterText: jobApplication.coverLetter?.content || undefined,
      jobDescription: jobApplication.jobDescription,
      jobTitle: jobApplication.jobTitle || undefined,
      companyName: jobApplication.companyName || undefined,
      companyInfo: jobApplication.companyInfo || undefined,
    })

    const latest = jobApplication.analyses[0]
    const latestHash = extractInputHash(latest?.rawResponse)

    if (latest && latestHash === inputHash) {
      await db.jobApplication.update({
        where: { id: jobApplication.id },
        data: { status: "ANALYZED" },
      })
      return latest
    }

    await deductCreditsForFeature({
      clerkUserId: clerkId,
      feature: "cv_analysis",
      details: { jobApplicationId: jobApplication.id },
    })

    const userContext: UserContext = {
      resumeText: jobApplication.resume?.content || undefined,
      coverLetterText: jobApplication.coverLetter?.content || undefined,
      jobDescriptionText: jobApplication.jobDescription,
      targetRole: jobApplication.jobTitle || undefined,
      targetCompany: jobApplication.companyName || undefined,
      careerPath: jobApplication.user.careerPath || undefined,
      industry: jobApplication.user.industry || undefined,
    }

    const { skill, systemMessage, userPrompt } = await routeToSkill(
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
    })

    const analysisResult = parseAnalysisJson(analysisContent)

    const analysis = await db.applicationAnalysis.create({
      data: {
        jobApplicationId: jobApplication.id,
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
            ? (analysisResult.keywordAnalysis as Record<string, unknown>)
            : null,
        rawResponse: withInputHash(analysisContent, inputHash),
        agentSkill: "APPLICATION_OPTIMIZER",
        creditsUsed: skill.creditCost,
      },
    })

    await db.jobApplication.update({
      where: { id: jobApplication.id },
      data: { status: "ANALYZED" },
    })

    return analysis
  } catch (error) {
    await db.jobApplication.updateMany({
      where: { id: jobApplicationId, userId },
      data: { status: "DRAFT" },
    })

    throw error
  }
}

export async function runApplicationAnalysis(params: {
  clerkId: string
  userId: string
  jobApplicationId: string
  idempotencyKey?: string
}) {
  const { clerkId, userId, jobApplicationId, idempotencyKey } = params

  if (idempotencyKey == null || idempotencyKey === "") {
    return runAnalysisCore({ clerkId, userId, jobApplicationId })
  }

  const compoundKey = userId + ":" + jobApplicationId + ":" + idempotencyKey
  const now = Date.now()
  const recent = recentResultByKey.get(compoundKey)
  if (recent && recent.expiresAt > now) {
    return recent.value
  }
  if (recent && recent.expiresAt <= now) {
    recentResultByKey.delete(compoundKey)
  }

  const existingInFlight = inFlightByKey.get(compoundKey)
  if (existingInFlight) {
    return existingInFlight
  }

  const currentPromise = runAnalysisCore({ clerkId, userId, jobApplicationId })
    .then((result) => {
      recentResultByKey.set(compoundKey, {
        value: result,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      })
      return result
    })
    .finally(() => {
      inFlightByKey.delete(compoundKey)
    })

  inFlightByKey.set(compoundKey, currentPromise)
  return currentPromise
}
