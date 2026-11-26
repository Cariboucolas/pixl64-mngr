<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <main class="centered">
    <div class="column">
      <h1>{{ title }}</h1>
      <slot />
    </div>
  </main>
</template>

<style scoped>
.centered {
  display: flex;
  justify-content: center;
  height: 100%;
  padding: var(--space-5);
  overflow-y: auto;
}

.column {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  width: 100%;
  max-width: 520px;
  padding-top: 8vh;
}

h1 {
  color: var(--color-accent);
}
</style>
