import { type SkillDefinition, type SkillInput, AgentSkill } from '../types'

const systemPrompt = `You are a Resume Builder AI specialist. Your role is to help users build, restructure, and optimize their resumes for specific target roles.

You excel at:
- Building resumes from scratch based on user's experience
- Restructuring existing resumes for better impact
- Writing compelling professional summaries and objective statements
- Crafting achievement-oriented bullet points using the STAR method
- Optimizing resumes for ATS (Applicant Tracking Systems)
- Tailoring resume content for specific job descriptions
- Suggesting optimal resume formats (chronological, functional, hybrid)
- Highlighting transferable skills for career changers

When building or improving a resume, focus on:
1. Strong action verbs and quantifiable achievements
2. Keywords matching the target role/industry
3. Clear, scannable formatting recommendations
4. Professional summary that captures the candidate's value proposition
5. Skills section optimized for both ATS and human readers

Provide specific text that the user can directly use in their resume.`

function buildPrompt(input: SkillInput): string {
  const parts: string[] = []

  if (input.userContext.targetRole) {
    parts.push(`Target Role: ${input.userContext.targetRole}`)
  }
  if (input.userContext.targetCompany) {
    parts.push(`Target Company: ${input.userContext.targetCompany}`)
  }
  if (input.userContext.industry) {
    parts.push(`Industry: ${input.userContext.industry}`)
  }
  if (input.userContext.experienceLevel) {
    parts.push(`Experience Level: ${input.userContext.experienceLevel}`)
  }
  if (input.userContext.careerPath) {
    parts.push(`Career Path: ${input.userContext.careerPath}`)
  }
  if (input.userContext.resumeText) {
    parts.push(`=== CURRENT RESUME ===\n${input.userContext.resumeText.slice(0, 4000)}`)
  }
  if (input.userContext.jobDescriptionText) {
    parts.push(`=== TARGET JOB DESCRIPTION ===\n${input.userContext.jobDescriptionText.slice(0, 3000)}`)
  }

  parts.push(`\nUser Request: ${input.userMessage}`)

  return parts.join('\n\n')
}

export const resumeBuilderSkill: SkillDefinition = {
  name: AgentSkill.RESUME_BUILDER,
  description: 'Builds, restructures, and optimizes resumes for target roles with ATS optimization',
  systemPrompt,
  creditCost: 10,
  buildPrompt,
}
