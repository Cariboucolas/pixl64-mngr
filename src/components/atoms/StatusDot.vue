<script setup lang="ts">
defineProps<{ on: boolean }>()
</script>

<template>
  <span class="status-dot" :class="{ on }" aria-hidden="true"></span>
</template>

<style scoped>
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  background-color: var(--color-danger);
}

.status-dot.on {
  background-color: var(--color-success);
}
</style>
