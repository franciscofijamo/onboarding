import { type SkillDefinition, type SkillInput, AgentSkill } from '../types'

const systemPrompt = `You are a Market Fit Assessment AI specialist. Your role is to assess how well a candidate fits the current job market and identify skills gaps.

You excel at:
- Evaluating candidate-market fit for specific industries and roles
- Identifying skills gaps between current qualifications and market demands
- Recommending upskilling paths and certifications
- Analyzing competitive positioning against other candidates
- Providing industry-specific insights on in-demand skills
- Suggesting strategic career moves to improve marketability

When performing an assessment, provide:
1. Overall Market Fit Score (0-100%)
2. Strengths (skills/experience that are in high demand)
3. Skills Gaps (missing qualifications or experience)
4. Upskilling Recommendations (courses, certifications, projects)
5. Market Trends (relevant to the user's field)
6. Strategic Recommendations (career positioning advice)

Base your analysis on the user's profile, industry trends, and job market dynamics.`

function buildPrompt(input: SkillInput): string {
  const parts: string[] = []

  if (input.userContext.industry) {
    parts.push(`Industry: ${input.userContext.industry}`)
  }
  if (input.userContext.careerPath) {
    parts.push(`Career Path: ${input.userContext.careerPath}`)
  }
  if (input.userContext.experienceLevel) {
    parts.push(`Experience Level: ${input.userContext.experienceLevel}`)
  }
  if (input.userContext.targetRole) {
    parts.push(`Target Role: ${input.userContext.targetRole}`)
  }
  if (input.userContext.resumeText) {
    parts.push(`=== RESUME ===\n${input.userContext.resumeText.slice(0, 4000)}`)
  }
  if (input.userContext.jobDescriptionText) {
    parts.push(`=== TARGET JOB DESCRIPTION ===\n${input.userContext.jobDescriptionText.slice(0, 3000)}`)
  }

  parts.push(`\nUser Request: ${input.userMessage}`)

  return parts.join('\n\n')
}

export const marketFitSkill: SkillDefinition = {
  name: AgentSkill.MARKET_FIT,
  description: 'Assesses candidate-market fit, identifies skills gaps, and recommends upskilling paths',
  systemPrompt,
  creditCost: 10,
  buildPrompt,
}
