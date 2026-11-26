<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: number
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const localValue = ref(props.modelValue)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.modelValue,
  (v) => {
    localValue.value = v
  },
)

const onInput = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  localValue.value = value
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update:modelValue', value)
  }, 200)
}
</script>

<template>
  <div class="brightness-slider">
    <label for="brightness">
      {{ t('panel.brightness') }}
      <span class="value">{{ localValue }}%</span>
    </label>
    <input
      id="brightness"
      type="range"
      min="0"
      max="100"
      :value="localValue"
      :disabled="disabled"
      @input="onInput"
    />
  </div>
</template>

<style scoped>
.brightness-slider {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.brightness-slider label {
  display: flex;
  justify-content: space-between;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.value {
  color: var(--color-accent);
  font-weight: 700;
}

input[type="range"] {
  width: 100%;
}
</style>
