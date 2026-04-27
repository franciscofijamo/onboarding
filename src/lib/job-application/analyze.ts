import { createHash } from "crypto"
import { db } from "@/lib/db"
import { deductCreditsForFeature, refundCreditsForFeature } from "@/lib/credits/deduct"
import { routeToSkill } from "@/lib/agents/orchestrator"
import { AgentSkill, type UserContext } from "@/lib/agents/types"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"
import { wrapPromptWithLanguage } from "@/lib/ai-language"

const PROVIDER = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const MAX_ERROR_LENGTH = 10_000

type AnalysisExecution = {
  id: string
  status: "PENDING" | "COMPLETED" | "FAILED"
  applicationAnalysisId: string | null
  creditsCharged: boolean
  creditsRefunded: boolean
}

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
  language?: string | null
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error)
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  )
}

export class AnalysisInProgressError extends Error {
  constructor() {
    super("Analysis already in progress")
    this.name = "AnalysisInProgressError"
  }
}

async function loadCompletedAnalysis(applicationAnalysisId: string) {
  const analysis = await db.applicationAnalysis.findUnique({
    where: { id: applicationAnalysisId },
  })

  if (!analysis) {
    throw new Error("Completed analysis record could not be found")
  }

  return analysis
}

async function findExistingExecution(params: {
  jobApplicationId: string
  inputHash: string
  idempotencyKey?: string
}) {
  const { jobApplicationId, inputHash, idempotencyKey } = params
  const orConditions: Array<{ inputHash: string } | { idempotencyKey: string }> = [{ inputHash }]

  if (idempotencyKey) {
    orConditions.push({ idempotencyKey })
  }

  return db.applicationAnalysisExecution.findFirst({
    where: {
      jobApplicationId,
      OR: orConditions,
    },
    select: {
      id: true,
      status: true,
      applicationAnalysisId: true,
      creditsCharged: true,
      creditsRefunded: true,
    },
  })
}

async function reserveExecution(params: {
  jobApplicationId: string
  userId: string
  inputHash: string
  idempotencyKey?: string
}): Promise<AnalysisExecution> {
  const { jobApplicationId, userId, inputHash, idempotencyKey } = params

  try {
    return await db.applicationAnalysisExecution.create({
      data: {
        jobApplicationId,
        userId,
        inputHash,
        idempotencyKey,
        status: "PENDING",
      },
      select: {
        id: true,
        status: true,
        applicationAnalysisId: true,
        creditsCharged: true,
        creditsRefunded: true,
      },
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error
    }

    const existing = await findExistingExecution({ jobApplicationId, inputHash, idempotencyKey })
    if (!existing) {
      throw error
    }

    if (existing.status === "COMPLETED" && existing.applicationAnalysisId) {
      return existing
    }

    if (existing.status === "PENDING") {
      throw new AnalysisInProgressError()
    }

    const reset = await db.applicationAnalysisExecution.updateMany({
      where: {
        id: existing.id,
        status: "FAILED",
      },
      data: {
        status: "PENDING",
        applicationAnalysisId: null,
        creditsCharged: false,
        creditsRefunded: false,
        lastError: null,
      },
    })

    if (reset.count === 0) {
      const current = await db.applicationAnalysisExecution.findUnique({
        where: { id: existing.id },
        select: {
          id: true,
          status: true,
          applicationAnalysisId: true,
          creditsCharged: true,
          creditsRefunded: true,
        },
      })

      if (current?.status === "COMPLETED" && current.applicationAnalysisId) {
        return current
      }

      throw new AnalysisInProgressError()
    }

    const restarted = await db.applicationAnalysisExecution.findUnique({
      where: { id: existing.id },
      select: {
        id: true,
        status: true,
        applicationAnalysisId: true,
        creditsCharged: true,
        creditsRefunded: true,
      },
    })

    if (!restarted) {
      throw new Error("Failed to reserve analysis execution")
    }

    return restarted
  }
}

async function runAnalysisCore(params: {
  clerkId: string
  userId: string
  jobApplicationId: string
  idempotencyKey?: string
}) {
  const { clerkId, userId, jobApplicationId, idempotencyKey } = params

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
    language: jobApplication.user.locale || undefined,
  })

  const latest = jobApplication.analyses[0]
  const latestHash = extractInputHash(latest?.rawResponse)

  if (latest && latestHash === inputHash) {
    if (!jobApplication.isPublicApplication) {
      await db.jobApplication.update({
        where: { id: jobApplication.id },
        data: { status: "ANALYZED" },
      })
    }
    return latest
  }

  const execution = await reserveExecution({
    jobApplicationId: jobApplication.id,
    userId,
    inputHash,
    idempotencyKey,
  })

  if (execution.status === "COMPLETED" && execution.applicationAnalysisId) {
    if (!jobApplication.isPublicApplication) {
      await db.jobApplication.update({
        where: { id: jobApplication.id },
        data: { status: "ANALYZED" },
      })
    }
    return loadCompletedAnalysis(execution.applicationAnalysisId)
  }

  // Public applications stay APPLIED throughout — status is driven by pipeline stage only
  if (!jobApplication.isPublicApplication) {
    await db.jobApplication.updateMany({
      where: { id: jobApplication.id, userId },
      data: { status: "ANALYZING" },
    })
  }

  let creditsCharged = false

  try {
    await deductCreditsForFeature({
      clerkUserId: clerkId,
      feature: "cv_analysis",
      details: { jobApplicationId: jobApplication.id, inputHash },
    })
    creditsCharged = true

    await db.applicationAnalysisExecution.update({
      where: { id: execution.id },
      data: {
        creditsCharged: true,
        creditsRefunded: false,
        lastError: null,
      },
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
      system: wrapPromptWithLanguage(systemMessage, jobApplication.user.locale),
      prompt: wrapPromptWithLanguage(
        userPrompt +
          "\n\nRespond ONLY with valid JSON. No markdown, no code fences, no explanations outside the JSON.",
        jobApplication.user.locale
      ),
      temperature: 0.7,
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'job-application-analysis',
        metadata: { posthog_distinct_id: clerkId },
      },
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
            ? (analysisResult.keywordAnalysis as any)
            : null,
        rawResponse: withInputHash(analysisContent, inputHash),
        agentSkill: "APPLICATION_OPTIMIZER",
        creditsUsed: skill.creditCost,
      },
    })

    await db.applicationAnalysisExecution.update({
      where: { id: execution.id },
      data: {
        status: "COMPLETED",
        applicationAnalysisId: analysis.id,
        lastError: null,
      },
    })

    // Public/platform applications remain APPLIED — status is pipeline-stage-driven, not AI-driven
    if (!jobApplication.isPublicApplication) {
      await db.jobApplication.update({
        where: { id: jobApplication.id },
        data: { status: "ANALYZED" },
      })
    }

    return analysis
  } catch (error) {
    const errorMessage = getErrorMessage(error).slice(0, MAX_ERROR_LENGTH)
    let creditsRefunded = false

    if (creditsCharged) {
      const refundResult = await refundCreditsForFeature({
        clerkUserId: clerkId,
        feature: "cv_analysis",
        reason: "analysis_execution_failed",
        details: { jobApplicationId: jobApplication.id, inputHash },
      })
      creditsRefunded = refundResult != null
    }

    await db.applicationAnalysisExecution.updateMany({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        applicationAnalysisId: null,
        creditsRefunded,
        lastError: errorMessage,
      },
    })

    // Do not downgrade public/platform applications — their submission state (APPLIED) must remain intact
    if (!jobApplication?.isPublicApplication) {
      await db.jobApplication.updateMany({
        where: { id: jobApplicationId, userId },
        data: { status: "DRAFT" },
      })
    }

    throw error
  }
}

export async function runApplicationAnalysis(params: {
  clerkId: string
  userId: string
  jobApplicationId: string
  idempotencyKey?: string
}) {
  return runAnalysisCore(params)
}
