import ptMZ from './locales/pt-MZ.json'
import enUS from './locales/en-US.json'
import enGB from './locales/en-GB.json'

export type Locale = 'pt-MZ' | 'en-US' | 'en-GB'

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'pt-MZ', label: 'Português (MZ)', flag: '🇲🇿' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
]

export const DEFAULT_LOCALE: Locale = 'pt-MZ'

const dictionaries: Record<Locale, Record<string, unknown>> = {
  'pt-MZ': ptMZ,
  'en-US': enUS,
  'en-GB': enGB,
}

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : undefined
}

export function getDictionary(locale: Locale): Record<string, unknown> {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE]
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  const dict = getDictionary(locale)
  let value = getNestedValue(dict, key)

  if (value === undefined) {
    const fallback = getDictionary(DEFAULT_LOCALE)
    value = getNestedValue(fallback, key)
  }

  if (value === undefined) {
    return key
  }

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }

  return value
}

export function getNestedTranslations(locale: Locale, prefix: string): Record<string, string> {
  const dict = getDictionary(locale)
  const nested = getNestedValue(dict as unknown as Record<string, unknown>, prefix)
  if (typeof nested === 'object' && nested !== null) {
    return nested as unknown as Record<string, string>
  }
  return {}
}

export function getTranslationArray(locale: Locale, key: string): string[] {
  const dict = getDictionary(locale)
  const keys = key.split('.')
  let current: unknown = dict
  for (const k of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return []
    }
    current = (current as Record<string, unknown>)[k]
  }
  return Array.isArray(current) ? current : []
}
