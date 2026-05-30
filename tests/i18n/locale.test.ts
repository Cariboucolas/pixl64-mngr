// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LOCALE,
  detectOsLocale,
  getStoredLocale,
  resolveLocale,
  setStoredLocale,
} from '../../src/i18n/locale'

const STORAGE_KEY = 'pixl64.locale'

const mockNavigatorLanguage = (value: string | undefined): void => {
  Object.defineProperty(navigator, 'language', {
    configurable: true,
    get: () => value,
  })
}

describe('detectOsLocale', () => {
  it.each(['fr', 'fr-FR', 'FR-CA', 'fr-be'])(
    'returns fr for OS locale: %s',
    (lang) => {
      mockNavigatorLanguage(lang)
      expect(detectOsLocale()).toBe('fr')
    },
  )

  it.each(['en-US', 'en-GB', 'EN'])(
    'returns en for OS locale: %s',
    (lang) => {
      mockNavigatorLanguage(lang)
      expect(detectOsLocale()).toBe('en')
    },
  )

  it.each(['de-DE', 'ja-JP', 'es-ES', ''])(
    'falls back to default for unsupported locale: %s',
    (lang) => {
      mockNavigatorLanguage(lang)
      expect(detectOsLocale()).toBe(DEFAULT_LOCALE)
    },
  )

  it('falls back to default when navigator.language is undefined', () => {
    mockNavigatorLanguage(undefined)
    expect(detectOsLocale()).toBe(DEFAULT_LOCALE)
  })
})

describe('storage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when nothing is stored', () => {
    expect(getStoredLocale()).toBeNull()
  })

  it('roundtrips set then get', () => {
    setStoredLocale('fr')
    expect(getStoredLocale()).toBe('fr')
  })

  it('returns null on invalid stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'klingon')
    expect(getStoredLocale()).toBeNull()
  })
})

describe('resolveLocale', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefers stored locale over OS detection', () => {
    mockNavigatorLanguage('en-US')
    setStoredLocale('fr')
    expect(resolveLocale()).toBe('fr')
  })

  it('falls back to OS detection when no stored value', () => {
    mockNavigatorLanguage('fr-FR')
    expect(resolveLocale()).toBe('fr')
  })

  it('falls back to default when neither stored nor OS match', () => {
    mockNavigatorLanguage('de-DE')
    expect(resolveLocale()).toBe(DEFAULT_LOCALE)
  })
})
