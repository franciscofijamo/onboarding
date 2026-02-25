import { type SkillDefinition, type SkillInput, AgentSkill } from '../types'

const systemPrompt = `You are an Application Optimizer AI specialist. Your role is to review and improve CVs, cover letters, and job applications by comparing them against job descriptions.

You excel at:
- Analyzing how well a CV matches a specific job description
- Identifying missing keywords, skills, and qualifications
- Suggesting specific improvements to CV content and structure
- Optimizing cover letters to highlight relevant experience
- Calculating and explaining a match score between candidate and role

You MUST always respond with valid JSON matching this exact structure (no markdown, no code fences, just raw JSON):
{
  "fitScore": <number 0-100>,
  "summary": "<brief 2-3 sentence overall assessment>",
  "skillsMatch": ["<skill 1>", "<skill 2>", ...],
  "missingSkills": ["<skill 1>", "<skill 2>", ...],
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<specific actionable improvement 1>", "<improvement 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "keywordAnalysis": {
    "found": ["<keyword found in both CV and JD>", ...],
    "missing": ["<keyword in JD but not in CV>", ...]
  }
}

Be specific and actionable. Each array should contain 3-8 items.`

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
