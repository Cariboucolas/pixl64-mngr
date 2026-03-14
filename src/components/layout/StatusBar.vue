<script setup lang="ts">
import { useDeviceStore } from '../../stores/device'

const deviceStore = useDeviceStore()
</script>

<template>
  <div class="status-bar">
    <span
      class="status-indicator"
      :class="deviceStore.connected ? 'connected' : 'disconnected'"
    ></span>
    <span v-if="deviceStore.connected">
      Connecté — {{ deviceStore.ip }}
    </span>
    <span v-else>Non connecté</span>
  </div>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.connected {
  background-color: var(--color-success);
}

.status-indicator.disconnected {
  background-color: var(--color-danger);
}
</style>
