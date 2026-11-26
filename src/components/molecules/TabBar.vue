<script setup lang="ts">
export interface Tab {
  id: string
  label: string
  /** Route name; a tab without one is announced but not yet available. */
  to?: string
}

defineProps<{
  tabs: Tab[]
  label: string
  unavailableLabel: string
}>()
</script>

<template>
  <nav class="tab-bar" :aria-label="label">
    <template v-for="tab in tabs" :key="tab.id">
      <RouterLink
        v-if="tab.to"
        class="tab"
        active-class="active"
        :to="{ name: tab.to }"
      >
        {{ tab.label }}
      </RouterLink>
      <span v-else class="tab unavailable" :title="unavailableLabel">
        {{ tab.label }}
        <span class="badge">{{ unavailableLabel }}</span>
      </span>
    </template>
  </nav>
</template>

<style scoped>
.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--color-rule);
  padding: 0 var(--space-4);
}

.tab {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
}

a.tab:hover {
  color: var(--color-text);
}

.tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.tab.unavailable {
  cursor: default;
}

.badge {
  font-size: var(--text-xs);
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  border: 1px solid var(--color-rule);
  padding: 0 var(--space-1);
}
</style>
