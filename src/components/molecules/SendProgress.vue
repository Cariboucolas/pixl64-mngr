<script setup lang="ts">
defineProps<{
  sent: number
  total: number
  /** Says where the send stands, e.g. "Sending… 12/59". */
  label: string
  cancelLabel: string
}>()

defineEmits<{
  cancel: []
}>()
</script>

<template>
  <div class="send-progress">
    <progress :value="sent" :max="total" :aria-label="label"></progress>
    <span class="count" role="status">{{ label }}</span>
    <button type="button" @click="$emit('cancel')">{{ cancelLabel }}</button>
  </div>
</template>

<style scoped>
.send-progress {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

progress {
  width: 12rem;
  height: 6px;
  accent-color: var(--color-accent);
}

.count {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}
</style>
