<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  on: boolean
  disabled: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <div class="power-toggle">
    <span id="power-label" class="label">{{ t('panel.screen') }}</span>
    <button
      type="button"
      role="switch"
      aria-labelledby="power-label"
      :aria-checked="on"
      :class="{ on }"
      :disabled="disabled"
      @click="$emit('toggle')"
    >
      {{ on ? t('panel.screenOn') : t('panel.screenOff') }}
    </button>
  </div>
</template>

<style scoped>
.power-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

button {
  min-width: 5.5rem;
  padding: var(--space-1) var(--space-3);
  font-weight: 700;
  color: var(--color-text-secondary);
}

button.on {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
