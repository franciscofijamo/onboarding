import { z } from 'zod'

export const AgentSkill = {
  JOB_HUNTER: 'JOB_HUNTER',
  APPLICATION_OPTIMIZER: 'APPLICATION_OPTIMIZER',
  MARKET_FIT: 'MARKET_FIT',
  BUSINESS_ENGLISH: 'BUSINESS_ENGLISH',
  RESUME_BUILDER: 'RESUME_BUILDER',
} as const

export type AgentSkillType = (typeof AgentSkill)[keyof typeof AgentSkill]

export const UserContextSchema = z.object({
  careerPath: z.string().optional(),
  industry: z.string().optional(),
  experienceLevel: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']).optional(),
  englishLevel: z.enum(['BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED', 'PROFICIENT']).optional(),
  resumeText: z.string().optional(),
  coverLetterText: z.string().optional(),
  jobDescriptionText: z.string().optional(),
  targetRole: z.string().optional(),
  targetCompany: z.string().optional(),
})

export type UserContext = z.infer<typeof UserContextSchema>

export interface SkillInput {
  userMessage: string
  userContext: UserContext
  language?: string
}

export interface SkillDefinition {
  name: AgentSkillType
  description: string
  systemPrompt: string
  creditCost: number
  buildPrompt: (input: SkillInput) => string
}

export interface SkillResponse {
  skill: AgentSkillType
  content: string
  structured?: Record<string, unknown>
}

export interface OrchestratorResult {
  selectedSkill: AgentSkillType
  response: SkillResponse
}
