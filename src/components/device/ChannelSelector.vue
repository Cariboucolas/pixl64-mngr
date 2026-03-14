<script setup lang="ts">
defineProps<{
  modelValue: number
  disabled: boolean
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()

const channels = [
  { id: 0, label: 'Faces' },
  { id: 1, label: 'Cloud' },
  { id: 2, label: 'Visualizer' },
  { id: 3, label: 'Custom' },
  { id: 4, label: 'Black Screen' },
]
</script>

<template>
  <div class="channel-selector">
    <label>Canal</label>
    <div class="channel-buttons">
      <button
        v-for="ch in channels"
        :key="ch.id"
        :class="{ active: modelValue === ch.id }"
        :disabled="disabled"
        @click="$emit('update:modelValue', ch.id)"
      >
        {{ ch.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.channel-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.channel-selector label {
  font-size: 0.875rem;
}

.channel-buttons {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.channel-buttons button {
  padding: 0.4rem 0.75rem;
  background-color: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-input-border);
  border-radius: var(--radius);
  font-size: 0.8rem;
}

.channel-buttons button.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.channel-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
