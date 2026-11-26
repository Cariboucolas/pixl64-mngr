<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  modelValue: number
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

/** Channel index on the device → name in the locale files (GLOSSARY: Canal). */
const CHANNELS = ['faces', 'cloud', 'visualizer', 'custom', 'blackScreen']

const onChange = (event: Event) => {
  emit('update:modelValue', Number((event.target as HTMLSelectElement).value))
}
</script>

<template>
  <div class="channel-selector">
    <label for="channel">{{ t('panel.channel') }}</label>
    <select
      id="channel"
      :value="modelValue"
      :disabled="disabled"
      @change="onChange"
    >
      <option v-for="(name, index) in CHANNELS" :key="name" :value="index">
        {{ t(`channel.${name}`) }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.channel-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

label {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

select {
  width: 100%;
}
</style>
