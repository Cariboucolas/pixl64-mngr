<script setup lang="ts">
import type { DivoomDevice } from '../../services/divoom/types'

defineProps<{
  device: DivoomDevice
  onConnect: boolean
}>()

defineEmits<{
  connect: [ip: string]
}>()
</script>

<template>
  <div class="device-card">
    <div class="device-info">
      <span class="device-name">{{ device.DeviceName }}</span>
      <span class="device-ip">{{ device.DevicePrivateIP }}</span>
    </div>
    <button
      class="primary"
      :disabled="connecting"
      @click="$emit('connect', device.DevicePrivateIP)"
    >
      {{ onConnect ? 'Connexion...' : 'Connecter' }}
    </button>
  </div>
</template>

<style scoped>
.device-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.device-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.device-name {
  font-weight: 600;
}

.device-ip {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
</style>
