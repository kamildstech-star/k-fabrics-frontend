import urdu from '../i18n/ur.json' with { type: 'json' }

export type StorefrontLanguage = 'en' | 'ur'
export const storefrontLanguageCookie = 'kf_language'

export const readStorefrontLanguage = (value: unknown): StorefrontLanguage =>
  value === 'ur' ? 'ur' : 'en'

export function translateStorefront(language: StorefrontLanguage, english: string, values?: Record<string, string | number>) {
  const copy = language === 'ur' && Object.hasOwn(urdu, english)
    ? urdu[english as keyof typeof urdu]
    : english
  return values ? copy.replace(/\{(\w+)\}/g, (match, key: string) => Object.hasOwn(values, key) ? String(values[key]) : match) : copy
}
