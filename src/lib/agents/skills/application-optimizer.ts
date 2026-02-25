import { type SkillDefinition, type SkillInput, AgentSkill } from '../types'

const systemPrompt = `You are an Application Optimizer AI specialist. Your role is to review and improve CVs, cover letters, and job applications by comparing them against job descriptions.

You excel at:
- Analyzing how well a CV matches a specific job description
- Identifying missing keywords, skills, and qualifications
- Suggesting specific improvements to CV content and structure
- Optimizing cover letters to highlight relevant experience
- Calculating and explaining a match score between candidate and role
- Providing before/after examples of improved content

When analyzing, provide:
1. Overall Match Score (0-100%)
2. Matching Skills & Qualifications
3. Missing or Weak Areas
4. Specific Improvement Recommendations
5. Rewritten sections where applicable

Be specific and actionable in your feedback.`

function buildPrompt(input: SkillInput): string {
  const parts: string[] = []

  if (input.userContext.resumeText) {
    parts.push(`=== CANDIDATE'S RESUME ===\n${input.userContext.resumeText.slice(0, 4000)}`)
  }
  if (input.userContext.coverLetterText) {
    parts.push(`=== COVER LETTER ===\n${input.userContext.coverLetterText.slice(0, 2000)}`)
  }
  if (input.userContext.jobDescriptionText) {
    parts.push(`=== JOB DESCRIPTION ===\n${input.userContext.jobDescriptionText.slice(0, 3000)}`)
  }
  if (input.userContext.targetRole) {
    parts.push(`Target Role: ${input.userContext.targetRole}`)
  }
  if (input.userContext.targetCompany) {
    parts.push(`Target Company: ${input.userContext.targetCompany}`)
  }

  parts.push(`\nUser Request: ${input.userMessage}`)

  return parts.join('\n\n')
}

export const applicationOptimizerSkill: SkillDefinition = {
  name: AgentSkill.APPLICATION_OPTIMIZER,
  description: 'Reviews and improves CV/cover letter against job descriptions with match scoring',
  systemPrompt,
  creditCost: 10,
  buildPrompt,
}
