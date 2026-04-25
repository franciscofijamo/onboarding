import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { deductCreditsForFeature, refundCreditsForFeature } from '@/lib/credits/deduct'
import { routeToSkill } from '@/lib/agents/orchestrator'
import { AnalysisInProgressError, runApplicationAnalysis } from '@/lib/job-application/analyze'
import { generateText } from 'ai'

vi.mock('@/lib/credits/deduct', () => ({
  deductCreditsForFeature: vi.fn(),
  refundCreditsForFeature: vi.fn(),
}))

vi.mock('@/lib/agents/orchestrator', () => ({
  routeToSkill: vi.fn(),
}))

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => 'mock-model')),
}))

function makeInputHash() {
  return createHash('sha256')
    .update(
      JSON.stringify({
        resumeText: 'Resume content',
        coverLetterText: undefined,
        jobDescription: 'Job description',
        jobTitle: 'Engineer',
        companyName: 'Acme',
        companyInfo: undefined,
        language: 'pt-MZ',
      })
    )
    .digest('hex')
}

function makeJobApplication(rawResponse?: string) {
  return {
    id: 'job-1',
    jobTitle: 'Engineer',
    companyName: 'Acme',
    companyInfo: null,
    jobDescription: 'Job description',
    status: 'DRAFT',
    resume: { id: 'resume-1', content: 'Resume content' },
    coverLetter: null,
    user: { careerPath: null, industry: null, locale: 'pt-MZ' },
    analyses: rawResponse
      ? [
          {
            id: 'analysis-latest',
            rawResponse,
            fitScore: 91,
            summary: 'Existing summary',
          },
        ]
      : [],
  }
}

describe('runApplicationAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.jobApplication.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(db.jobApplication.update).mockResolvedValue({ id: 'job-1', status: 'ANALYZED' } as never)
    vi.mocked(db.applicationAnalysisExecution.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(db.applicationAnalysisExecution.update).mockResolvedValue({ id: 'exec-1' } as never)
    vi.mocked(deductCreditsForFeature).mockResolvedValue({ creditsRemaining: 90 })
    vi.mocked(refundCreditsForFeature).mockResolvedValue({ creditsRemaining: 100 })
    vi.mocked(routeToSkill).mockResolvedValue({
      skill: { creditCost: 10 },
      systemMessage: 'system',
      userPrompt: 'prompt',
    } as never)
    vi.mocked(generateText).mockResolvedValue({ text: '{"fitScore":88,"summary":"Strong match"}' } as never)
    vi.mocked(db.applicationAnalysis.create).mockResolvedValue({
      id: 'analysis-new',
      fitScore: 88,
      summary: 'Strong match',
    } as never)
    vi.mocked(db.applicationAnalysis.findUnique).mockResolvedValue({
      id: 'analysis-existing',
      fitScore: 80,
      summary: 'Persisted result',
    } as never)
  })

  it('returns the latest analysis without charging again when the payload hash matches', async () => {
    const inputHash = makeInputHash()
    vi.mocked(db.jobApplication.findFirst).mockResolvedValue(
      makeJobApplication(`__INPUT_HASH__:${inputHash}\n{"fitScore":91}`) as never
    )

    const result = await runApplicationAnalysis({
      clerkId: 'clerk-1',
      userId: 'user-1',
      jobApplicationId: 'job-1',
      idempotencyKey: 'idem-1',
    })

    expect(result).toMatchObject({ id: 'analysis-latest', fitScore: 91 })
    expect(deductCreditsForFeature).not.toHaveBeenCalled()
    expect(db.applicationAnalysisExecution.create).not.toHaveBeenCalled()
  })

  it('reuses a completed execution after a unique-conflict race', async () => {
    vi.mocked(db.jobApplication.findFirst).mockResolvedValue(makeJobApplication() as never)
    vi.mocked(db.applicationAnalysisExecution.create).mockRejectedValue({ code: 'P2002' })
    vi.mocked(db.applicationAnalysisExecution.findFirst).mockResolvedValue({
      id: 'exec-1',
      status: 'COMPLETED',
      applicationAnalysisId: 'analysis-existing',
      creditsCharged: true,
      creditsRefunded: false,
    } as never)

    const result = await runApplicationAnalysis({
      clerkId: 'clerk-1',
      userId: 'user-1',
      jobApplicationId: 'job-1',
      idempotencyKey: 'idem-1',
    })

    expect(result).toMatchObject({ id: 'analysis-existing', fitScore: 80 })
    expect(deductCreditsForFeature).not.toHaveBeenCalled()
    expect(db.applicationAnalysis.findUnique).toHaveBeenCalledWith({ where: { id: 'analysis-existing' } })
  })

  it('throws AnalysisInProgressError when a matching execution is already pending', async () => {
    vi.mocked(db.jobApplication.findFirst).mockResolvedValue(makeJobApplication() as never)
    vi.mocked(db.applicationAnalysisExecution.create).mockRejectedValue({ code: 'P2002' })
    vi.mocked(db.applicationAnalysisExecution.findFirst).mockResolvedValue({
      id: 'exec-1',
      status: 'PENDING',
      applicationAnalysisId: null,
      creditsCharged: false,
      creditsRefunded: false,
    } as never)

    await expect(
      runApplicationAnalysis({
        clerkId: 'clerk-1',
        userId: 'user-1',
        jobApplicationId: 'job-1',
        idempotencyKey: 'idem-1',
      })
    ).rejects.toBeInstanceOf(AnalysisInProgressError)

    expect(deductCreditsForFeature).not.toHaveBeenCalled()
  })

  it('refunds credits and restores the application state when analysis generation fails', async () => {
    vi.mocked(db.jobApplication.findFirst).mockResolvedValue(makeJobApplication() as never)
    vi.mocked(db.applicationAnalysisExecution.create).mockResolvedValue({
      id: 'exec-1',
      status: 'PENDING',
      applicationAnalysisId: null,
      creditsCharged: false,
      creditsRefunded: false,
    } as never)
    vi.mocked(generateText).mockRejectedValue(new Error('provider timeout'))

    await expect(
      runApplicationAnalysis({
        clerkId: 'clerk-1',
        userId: 'user-1',
        jobApplicationId: 'job-1',
        idempotencyKey: 'idem-2',
      })
    ).rejects.toThrow('provider timeout')

    expect(deductCreditsForFeature).toHaveBeenCalledTimes(1)
    expect(refundCreditsForFeature).toHaveBeenCalledWith({
      clerkUserId: 'clerk-1',
      feature: 'cv_analysis',
      reason: 'analysis_execution_failed',
      details: expect.objectContaining({ jobApplicationId: 'job-1' }),
    })
    expect(db.jobApplication.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', userId: 'user-1' },
      data: { status: 'DRAFT' },
    })
  })

  it('instructs the AI to respond in the user locale', async () => {
    vi.mocked(db.jobApplication.findFirst).mockResolvedValue(makeJobApplication() as never)
    vi.mocked(db.applicationAnalysisExecution.create).mockResolvedValue({
      id: 'exec-1',
      status: 'PENDING',
      applicationAnalysisId: null,
      creditsCharged: false,
      creditsRefunded: false,
    } as never)

    await runApplicationAnalysis({
      clerkId: 'clerk-1',
      userId: 'user-1',
      jobApplicationId: 'job-1',
      idempotencyKey: 'idem-locale',
    })

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('Responda inteiramente em português'),
        prompt: expect.stringContaining('Responda inteiramente em português'),
      })
    )
  })
})
