<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDeviceStore } from '../../stores/device'

const { t } = useI18n()
const deviceStore = useDeviceStore()
</script>

<template>
  <div class="status-bar">
    <span
      class="status-indicator"
      :class="deviceStore.connected ? 'connected' : 'disconnected'"
    ></span>
    <span v-if="deviceStore.connected">
      {{ t('status.connectedTo', { ip: deviceStore.ip }) }}
    </span>
    <span v-else>{{ t('status.notConnected') }}</span>
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
