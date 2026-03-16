<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '../stores/device'
import { useSettingsStore } from '../stores/settings'

const router = useRouter()
const deviceStore = useDeviceStore()
const settingsStore = useSettingsStore()

onMounted(async () => {
  await settingsStore.hydrate()

  if (
    settingsStore.autoConnect &&
    settingsStore.lastDeviceIp &&
    !deviceStore.connected
  ) {
    try {
      await deviceStore.connect(settingsStore.lastDeviceIp)
    } catch {
      // silent — user will see status bar
    }
  }
})
</script>

<template>
  <div class="page">
    <h1>Dashboard</h1>

    <div class="status-card" :class="deviceStore.connected ? 'connected' : 'disconnected'">
      <span class="dot"></span>
      <span v-if="deviceStore.connected">
        Connecté à <strong>{{ deviceStore.ip }}</strong>
        — Luminosité : {{ deviceStore.brightness }}%
      </span>
      <span v-else>Aucun appareil connecté</span>
    </div>

    <div class="quick-actions">
      <h2>Actions rapides</h2>
      <div class="actions-grid">
        <button class="primary" @click="router.push('/connect')">
          {{ deviceStore.connected ? 'Changer d\'appareil' : 'Se connecter' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: var(--radius);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  margin-bottom: 1.5rem;
}

.status-card.connected {
  border-color: var(--color-success);
}

.status-card.disconnected {
  border-color: var(--color-danger);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.connected .dot {
  background-color: var(--color-success);
}

.disconnected .dot {
  background-color: var(--color-danger);
}

.quick-actions h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
  color: var(--color-text-secondary);
}

.actions-grid {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
