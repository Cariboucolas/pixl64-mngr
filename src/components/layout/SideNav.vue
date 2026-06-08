<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { switchLocale } from '../../i18n'
import type { SupportedLocale } from '../../i18n/locale'
import { useDeviceStore } from '../../stores/device.ts'

const { t, locale } = useI18n()
const deviceStore = useDeviceStore()
const router = useRouter()
const onDisconnect = () => {
  deviceStore.disconnect()
  router.push('/connect')
}
const onLocaleChange = (next: SupportedLocale) => {
  switchLocale(next)
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
          <RouterLink to="/" exact-active-class="active">{{ t('nav.dashboard') }}</RouterLink>
        </li>
        <li>
          <RouterLink to="/controls" active-class="active">{{ t('nav.controls') }}</RouterLink>
        </li>
        <li>
          <RouterLink to="/send" active-class="active">{{ t('nav.sendImage') }}</RouterLink>
        </li>
        <li>
          <RouterLink to="/favorites" active-class="active">{{ t('nav.favorites') }}</RouterLink>
        </li>
      </ul>
      </div>
    <ul class="side-nav-footer">
      <li class="locale-switcher">
        <button
          :class="{ active: locale === 'en' }"
          aria-label="English"
          @click="onLocaleChange('en')"
        >EN</button>
        <button
          :class="{ active: locale === 'fr' }"
          aria-label="Français"
          @click="onLocaleChange('fr')"
        >FR</button>
      </li>
      <li>
        <button class="primary" @click="onDisconnect">{{ t('nav.disconnect') }}</button>
      </li>
    </ul>
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
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.side-nav-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text);
}

.side-nav-footer {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: stretch;
  padding: 1rem;
  margin: 0;
}

.locale-switcher {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
}

.locale-switcher button {
  padding: 0.25rem 0.5rem;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.locale-switcher button.active {
  background-color: var(--color-active);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.side-nav-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.side-nav-links li a {
  display: block;
  padding: 0.75rem 1rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
}

.side-nav-links li a:hover {
  background-color: var(--color-hover);
  color: var(--color-text);
}

.side-nav-links li a.active {
  background-color: var(--color-active);
  color: var(--color-primary);
  font-weight: 600;
}
</style>
