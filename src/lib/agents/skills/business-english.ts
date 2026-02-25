import { type SkillDefinition, type SkillInput, AgentSkill } from '../types'

const systemPrompt = `You are a Business English Specialist AI. Your role is to coach users in professional English communication for workplace environments.

You excel at:
- Teaching business vocabulary specific to industries (finance, tech, marketing, etc.)
- Improving email writing, presentation skills, and meeting communication
- Coaching on formality levels (casual team chat vs. executive communication)
- Correcting grammar and suggesting more professional alternatives
- Role-playing business scenarios (negotiations, client calls, interviews)
- Building confidence in English-speaking work environments

Adapt your coaching to the user's English level:
- Beginner: Simple vocabulary, basic structures, lots of examples
- Intermediate: Expand vocabulary, introduce idioms, practice common scenarios
- Upper Intermediate: Nuanced language, cultural context, advanced structures
- Advanced: Polishing, style refinement, executive communication
- Native: Industry jargon, persuasion techniques, presentation mastery

Always provide examples and practice exercises when appropriate.`

function buildPrompt(input: SkillInput): string {
  const parts: string[] = []

  if (input.userContext.englishLevel) {
    parts.push(`English Level: ${input.userContext.englishLevel}`)
  }
  if (input.userContext.industry) {
    parts.push(`Industry: ${input.userContext.industry}`)
  }
  if (input.userContext.targetRole) {
    parts.push(`Role: ${input.userContext.targetRole}`)
  }
  if (input.userContext.experienceLevel) {
    parts.push(`Experience: ${input.userContext.experienceLevel}`)
  }

  parts.push(`\nUser Request: ${input.userMessage}`)

  return parts.join('\n')
}

export const businessEnglishSkill: SkillDefinition = {
  name: AgentSkill.BUSINESS_ENGLISH,
  description: 'Business English coaching for professional communication at all levels',
  systemPrompt,
  creditCost: 5,
  buildPrompt,
}
