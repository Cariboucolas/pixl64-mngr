<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <div class="error-alert">
    {{ message }}
  </div>
</template>

<style scoped>
.error-alert {
  padding: 0.75rem 1rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius);
  color: var(--color-danger);
  font-size: 0.85rem;
}
</style>
