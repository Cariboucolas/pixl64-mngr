import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'
import fr from '../locales/fr.json'
import {
  DEFAULT_LOCALE,
  resolveLocale,
  type SupportedLocale,
  setStoredLocale,
} from './locale'

export const i18n = createI18n({
  legacy: false,
  locale: resolveLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    en,
    fr,
  },
})

export const switchLocale = (locale: SupportedLocale): void => {
  i18n.global.locale.value = locale
  setStoredLocale(locale)
}
