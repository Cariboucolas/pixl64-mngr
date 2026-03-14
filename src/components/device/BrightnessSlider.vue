<script setup lang="ts">
import { ref, watch } from 'vue'

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

function _onInput(event: Event) {
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
    <label>
      Luminosité
      <span class="value">{{ localValue }}%</span>
    </label>
    <input
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
  gap: 0.5rem;
}

.brightness-slider label {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.value {
  color: var(--color-primary);
  font-weight: 600;
}

input[type="range"] {
  width: 100%;
  accent-color: var(--color-primary);
}
</style>
