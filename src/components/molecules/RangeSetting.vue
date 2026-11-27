<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from 'vue'

/** While the handle moves, the value is sent at most this often. */
const SEND_DELAY_MS = 200

const props = defineProps<{
  label: string
  /** A share from 0 to 100. */
  modelValue: number
  disabled: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const id = useId()
const localValue = ref(props.modelValue)
let sendTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.modelValue,
  (value) => {
    localValue.value = value
  },
)

const onInput = (event: Event) => {
  const value = Number((event.target as HTMLInputElement).value)
  localValue.value = value
  if (sendTimer) clearTimeout(sendTimer)
  sendTimer = setTimeout(() => {
    emit('update:modelValue', value)
  }, SEND_DELAY_MS)
}

onBeforeUnmount(() => {
  if (sendTimer) clearTimeout(sendTimer)
})
</script>

<template>
  <div class="range-setting">
    <label :for="id">
      {{ label }}
      <span class="value">{{ localValue }}%</span>
    </label>
    <input
      :id="id"
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
.range-setting {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

label {
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
