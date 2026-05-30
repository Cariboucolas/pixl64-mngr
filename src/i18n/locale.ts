export type SupportedLocale = 'en' | 'fr'

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['en', 'fr']
export const DEFAULT_LOCALE: SupportedLocale = 'en'

const STORAGE_KEY = 'pixl64.locale'

const isSupported = (value: string | null): value is SupportedLocale =>
  value !== null && SUPPORTED_LOCALES.includes(value as SupportedLocale)

export const detectOsLocale = (): SupportedLocale => {
  const lang = navigator.language?.toLowerCase() ?? ''
  if (lang.startsWith('fr')) return 'fr'
  return DEFAULT_LOCALE
}

export const getStoredLocale = (): SupportedLocale | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isSupported(stored) ? stored : null
  } catch {
    return null
  }
}

export const setStoredLocale = (locale: SupportedLocale): void => {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Silently ignore — localStorage may be unavailable (private mode, etc.)
  }
}

export const resolveLocale = (): SupportedLocale =>
  getStoredLocale() ?? detectOsLocale()
