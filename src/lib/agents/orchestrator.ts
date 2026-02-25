import { type AgentSkillType, type SkillInput, type SkillDefinition, type SkillResponse, type OrchestratorResult, type UserContext, AgentSkill } from './types'
import { jobHunterSkill } from './skills/job-hunter'
import { applicationOptimizerSkill } from './skills/application-optimizer'
import { marketFitSkill } from './skills/market-fit'
import { businessEnglishSkill } from './skills/business-english'
import { resumeBuilderSkill } from './skills/resume-builder'
import { getLanguageInstruction } from '@/lib/ai-language'

const SKILLS_REGISTRY: Record<AgentSkillType, SkillDefinition> = {
  [AgentSkill.JOB_HUNTER]: jobHunterSkill,
  [AgentSkill.APPLICATION_OPTIMIZER]: applicationOptimizerSkill,
  [AgentSkill.MARKET_FIT]: marketFitSkill,
  [AgentSkill.BUSINESS_ENGLISH]: businessEnglishSkill,
  [AgentSkill.RESUME_BUILDER]: resumeBuilderSkill,
}

export function getSkill(skillName: AgentSkillType): SkillDefinition {
  const skill = SKILLS_REGISTRY[skillName]
  if (!skill) {
    throw new Error(`Unknown skill: ${skillName}`)
  }
  return skill
}

export function getAllSkills(): SkillDefinition[] {
  return Object.values(SKILLS_REGISTRY)
}

export function getSkillCreditCost(skillName: AgentSkillType): number {
  return getSkill(skillName).creditCost
}

const SKILL_KEYWORDS: Record<AgentSkillType, string[]> = {
  [AgentSkill.JOB_HUNTER]: [
    'find job', 'job search', 'job opportunities', 'job market', 'salary', 'companies hiring',
    'where to apply', 'job boards', 'networking', 'career opportunities', 'vacancies',
  ],
  [AgentSkill.APPLICATION_OPTIMIZER]: [
    'optimize', 'improve my cv', 'improve my resume', 'cover letter', 'match score',
    'application', 'tailor', 'keywords', 'job description match', 'compare cv', 'compare resume',
    'missing skills', 'ats',
  ],
  [AgentSkill.MARKET_FIT]: [
    'market fit', 'skills gap', 'upskill', 'certification', 'competitive', 'in demand',
    'career change', 'transferable skills', 'market trends', 'industry trends', 'positioning',
  ],
  [AgentSkill.BUSINESS_ENGLISH]: [
    'english', 'vocabulary', 'grammar', 'email writing', 'presentation', 'meeting',
    'formal', 'informal', 'idioms', 'pronunciation', 'communication', 'writing skills',
    'business english', 'professional english',
  ],
  [AgentSkill.RESUME_BUILDER]: [
    'build resume', 'build cv', 'write resume', 'write cv', 'restructure', 'format resume',
    'professional summary', 'bullet points', 'achievements', 'resume from scratch',
    'create resume', 'create cv', 'resume template',
  ],
}

export function detectSkill(userMessage: string, userContext: UserContext): AgentSkillType {
  const messageLower = userMessage.toLowerCase()

  let bestSkill: AgentSkillType = AgentSkill.APPLICATION_OPTIMIZER
  let bestScore = 0

  for (const [skill, keywords] of Object.entries(SKILL_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (messageLower.includes(keyword)) {
        score += keyword.split(' ').length
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestSkill = skill as AgentSkillType
    }
  }

  if (bestScore === 0) {
    if (userContext.resumeText && userContext.jobDescriptionText) {
      return AgentSkill.APPLICATION_OPTIMIZER
    }
    if (userContext.resumeText && !userContext.jobDescriptionText) {
      return AgentSkill.RESUME_BUILDER
    }
    if (userContext.englishLevel) {
      return AgentSkill.BUSINESS_ENGLISH
    }
    return AgentSkill.JOB_HUNTER
  }

  return bestSkill
}

export function buildSkillMessages(
  skill: SkillDefinition,
  input: SkillInput
): { systemMessage: string; userMessage: string } {
  const langInstruction = getLanguageInstruction(input.language)
  const systemMessage = `${langInstruction}\n\n${skill.systemPrompt}`
  const userMessage = skill.buildPrompt(input)
  return { systemMessage, userMessage }
}

export async function routeToSkill(
  userMessage: string,
  userContext: UserContext,
  options?: { skill?: AgentSkillType; language?: string }
): Promise<{ skill: SkillDefinition; systemMessage: string; userPrompt: string; creditCost: number }> {
  const selectedSkillName = options?.skill ?? detectSkill(userMessage, userContext)
  const skill = getSkill(selectedSkillName)

  const input: SkillInput = {
    userMessage,
    userContext,
    language: options?.language,
  }

  const { systemMessage, userMessage: userPrompt } = buildSkillMessages(skill, input)

  return {
    skill,
    systemMessage,
    userPrompt,
    creditCost: skill.creditCost,
  }
}

export { AgentSkill, type AgentSkillType, type UserContext, type SkillInput, type SkillDefinition, type SkillResponse, type OrchestratorResult } from './types'
