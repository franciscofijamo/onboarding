const SUPPORTED_LANGUAGES = ['pt-MZ', 'en-US', 'en-GB'] as const
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

const LANGUAGE_INSTRUCTIONS: Record<SupportedLanguage, string> = {
  'pt-MZ': `IDIOMA DE RESPOSTA: Responda inteiramente em Português (variante de Moçambique). Use vocabulário e expressões comuns em Moçambique. Todos os textos, justificativas, recomendações, sugestões de reescrita e comentários devem estar em Português.`,
  'en-US': `RESPONSE LANGUAGE: Respond entirely in American English (US). Use American spelling conventions (e.g., "analyze", "organize", "color"). All text content including justifications, recommendations, rewrite suggestions, and comments must be in English.`,
  'en-GB': `RESPONSE LANGUAGE: Respond entirely in British English (UK). Use British spelling conventions (e.g., "analyse", "organise", "colour"). All text content including justifications, recommendations, rewrite suggestions, and comments must be in English.`,
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'pt-MZ': 'Português (Moçambique)',
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
}

export function getLanguageInstruction(language?: string | null): string {
  if (!language || !SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
    return LANGUAGE_INSTRUCTIONS['pt-MZ']
  }
  return LANGUAGE_INSTRUCTIONS[language as SupportedLanguage]
}

export function getLanguageLabel(language?: string | null): string {
  if (!language || !SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
    return LANGUAGE_LABELS['pt-MZ']
  }
  return LANGUAGE_LABELS[language as SupportedLanguage]
}

export function isValidLanguage(language?: string | null): language is SupportedLanguage {
  return !!language && SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
}

export function wrapPromptWithLanguage(prompt: string, language?: string | null): string {
  const langInstruction = getLanguageInstruction(language)
  return `${langInstruction}

IMPORTANT: The JSON structure keys (nota_geral, criterios, pontos_fortes, pontos_melhoria, etc.) must remain EXACTLY as specified. Only the TEXT VALUES inside those keys should be in the specified language.

${prompt}`
}
