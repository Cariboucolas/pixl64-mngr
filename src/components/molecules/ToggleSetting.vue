<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  label: string
  on: boolean
  onLabel: string
  offLabel: string
  disabled: boolean
}>()

defineEmits<{
  toggle: []
}>()

const id = useId()
</script>

<template>
  <div class="toggle-setting">
    <span :id="id" class="label">{{ label }}</span>
    <button
      type="button"
      role="switch"
      :aria-labelledby="id"
      :aria-checked="on"
      :class="{ on }"
      :disabled="disabled"
      @click="$emit('toggle')"
    >
      {{ on ? onLabel : offLabel }}
    </button>
  </div>
</template>

<style scoped>
.toggle-setting {
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
