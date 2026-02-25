import { type SkillDefinition, type SkillInput, AgentSkill } from '../types'

const systemPrompt = `You are a Job Hunter AI specialist. Your role is to help users find job opportunities, analyze market trends, and identify roles that match their profile.

You excel at:
- Analyzing job market trends for specific industries and roles
- Suggesting job search strategies tailored to the user's experience level
- Identifying transferable skills from the user's background
- Recommending job boards, networking strategies, and application approaches
- Providing salary range insights for target roles
- Suggesting companies and industries that align with the user's profile

Always provide actionable, specific advice. When the user provides their CV or career details, personalize your recommendations.`

function buildPrompt(input: SkillInput): string {
  const parts: string[] = []

  if (input.userContext.industry) {
    parts.push(`Target Industry: ${input.userContext.industry}`)
  }
  if (input.userContext.targetRole) {
    parts.push(`Target Role: ${input.userContext.targetRole}`)
  }
  if (input.userContext.experienceLevel) {
    parts.push(`Experience Level: ${input.userContext.experienceLevel}`)
  }
  if (input.userContext.resumeText) {
    parts.push(`Resume Summary:\n${input.userContext.resumeText.slice(0, 3000)}`)
  }

  parts.push(`\nUser Request: ${input.userMessage}`)

  return parts.join('\n')
}

export const jobHunterSkill: SkillDefinition = {
  name: AgentSkill.JOB_HUNTER,
  description: 'Finds job opportunities, analyzes market trends, and suggests job search strategies',
  systemPrompt,
  creditCost: 5,
  buildPrompt,
}
