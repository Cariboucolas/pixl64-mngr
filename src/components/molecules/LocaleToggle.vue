<script setup lang="ts">
defineProps<{
  /** Code of the language in use, shown on the button. */
  locale: string
  label: string
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <button
    class="locale-toggle"
    type="button"
    :aria-label="label"
    :title="label"
    @click="$emit('toggle')"
  >
    {{ locale }}
  </button>
</template>

<style scoped>
.locale-toggle {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
  font-weight: 700;
  text-transform: uppercase;
}
</style>
