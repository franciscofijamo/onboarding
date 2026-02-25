const SUPPORTED_LANGUAGES = ['en-US', 'en-GB'] as const
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

const LANGUAGE_INSTRUCTIONS: Record<SupportedLanguage, string> = {
  'en-US': `RESPONSE LANGUAGE: Respond entirely in American English (US). Use American spelling conventions (e.g., "analyze", "organize", "color"). All text content including justifications, recommendations, rewrite suggestions, and comments must be in English.`,
  'en-GB': `RESPONSE LANGUAGE: Respond entirely in British English (UK). Use British spelling conventions (e.g., "analyse", "organise", "colour"). All text content including justifications, recommendations, rewrite suggestions, and comments must be in English.`,
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
}

export function getLanguageInstruction(language?: string | null): string {
  if (!language || !SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
    return LANGUAGE_INSTRUCTIONS['en-US']
  }
  return LANGUAGE_INSTRUCTIONS[language as SupportedLanguage]
}

export function getLanguageLabel(language?: string | null): string {
  if (!language || !SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
    return LANGUAGE_LABELS['en-US']
  }
  return LANGUAGE_LABELS[language as SupportedLanguage]
}

export function isValidLanguage(language?: string | null): language is SupportedLanguage {
  return !!language && SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
}

export function wrapPromptWithLanguage(prompt: string, language?: string | null): string {
  const langInstruction = getLanguageInstruction(language)
  return `${langInstruction}

IMPORTANT: The JSON structure keys must remain EXACTLY as specified in the schema. Only the TEXT VALUES inside those keys should be in the specified language.

${prompt}`
}
