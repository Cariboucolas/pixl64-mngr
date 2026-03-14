<script setup lang="ts">
import { useDeviceStore } from '../stores/device'

const deviceStore = useDeviceStore()

async function onBrightnessChange(value: number) {
  try {
    await deviceStore.setBrightness(value)
  } catch {
    // error is in store
  }
}

async function onChannelChange(value: number) {
  try {
    await deviceStore.setChannel(value)
  } catch {
    // error is in store
  }
}

async function onTogglePower() {
  try {
    await deviceStore.togglePower()
  } catch {
    // error is in store
  }
}
</script>

<template>
  <div class="page">
    <h1>Contrôles</h1>

    <p v-if="!deviceStore.connected" class="hint">
      Connectez-vous d'abord à un appareil.
    </p>

    <div v-else class="controls-grid">
      <div class="control-card">
        <BrightnessSlider
          :model-value="deviceStore.brightness"
          :disabled="!deviceStore.isReady"
          @update:model-value="onBrightnessChange"
        />
      </div>

      <div class="control-card">
        <ChannelSelector
          :model-value="deviceStore.channel"
          :disabled="!deviceStore.isReady"
          @update:model-value="onChannelChange"
        />
      </div>

      <div class="control-card">
        <PowerToggle
          :on="deviceStore.screenOn"
          :disabled="!deviceStore.isReady"
          @toggle="onTogglePower"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.controls-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 400px;
}

.control-card {
  padding: 1rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}

.hint {
  color: var(--color-text-secondary);
}
</style>
