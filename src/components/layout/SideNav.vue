<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import HomeIcon from '../../assets/icons/home.svg?component'
import ImageIcon from '../../assets/icons/image.svg?component'
import SlidersIcon from '../../assets/icons/sliders.svg?component'
import StarIcon from '../../assets/icons/star.svg?component'
import { switchLocale } from '../../i18n'
import type { SupportedLocale } from '../../i18n/locale'

const { t, locale } = useI18n()

const FLAGS: Record<SupportedLocale, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
}

const otherLocale = (current: string): SupportedLocale =>
  current === 'fr' ? 'en' : 'fr'

const onLocaleToggle = () => {
  switchLocale(otherLocale(locale.value))
}
</script>

<template>
  <nav class="side-nav">
    <div class="side-nav-top">
      <div class="side-nav-header">
        <h2>{{ t('nav.appName') }}</h2>
      </div>
      <ul class="side-nav-links">
        <li>
          <RouterLink to="/" exact-active-class="active">
            <HomeIcon class="nav-icon" aria-hidden="true" />
            <span>{{ t('nav.dashboard') }}</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/controls" active-class="active">
            <SlidersIcon class="nav-icon" aria-hidden="true" />
            <span>{{ t('nav.controls') }}</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/send" active-class="active">
            <ImageIcon class="nav-icon" aria-hidden="true" />
            <span>{{ t('nav.sendImage') }}</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/favorites" active-class="active">
            <StarIcon class="nav-icon" aria-hidden="true" />
            <span>{{ t('nav.favorites') }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
    <div class="side-nav-footer">
      <button
        class="locale-toggle"
        type="button"
        :aria-label="t('settings.changeLanguage')"
        :title="t('settings.changeLanguage')"
        @click="onLocaleToggle"
      >
        {{ FLAGS[locale as SupportedLocale] }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
.side-nav {
  width: 200px;
  background-color: var(--color-sidebar-bg);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-shrink: 0;
}

.side-nav-header {
  padding: 1.25rem 1rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.side-nav-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text);
  letter-spacing: 0.02em;
}

.side-nav-links {
  list-style: none;
  padding: 0.5rem 0;
  margin: 0;
}

.side-nav-links li a {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
  border-left: 3px solid transparent;
}

.side-nav-links li a:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.side-nav-links li a.active {
  background-color: var(--color-active);
  color: var(--color-primary);
  font-weight: 600;
  border-left-color: var(--color-primary);
}

.nav-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.side-nav-footer {
  display: flex;
  justify-content: center;
  padding: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.locale-toggle {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.35rem 0.75rem;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s, transform 0.15s;
}

.locale-toggle:hover {
  background-color: var(--color-hover);
  transform: translateY(-1px);
}

.locale-toggle:active {
  transform: translateY(0);
}
</style>
