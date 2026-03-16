<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import DeviceCard from '../components/device/DeviceCard.vue'
import type { DivoomDevice } from '../services/divoom/types.ts'
import { useDeviceStore } from '../stores/device'
import { useSettingsStore } from '../stores/settings'

const deviceStore = useDeviceStore()
const settingsStore = useSettingsStore()
const router = useRouter()
const manualIp = ref(settingsStore.lastDeviceIp)
const manualError = ref<string | null>(null)

const handleConnect = async (ip: string) => {
  manualError.value = null
  try {
    await deviceStore.connect(ip)
    settingsStore.lastDeviceIp = ip
    await router.push('/')
  } catch (e) {
    manualError.value = e instanceof Error ? e.message : 'Erreur de connexion'
  }
}

const handleManualConnect = async () => {
  const ip = manualIp.value.trim()
  if (!ip) return
  await handleConnect(ip)
}

const getDeviceStatus = (device: DivoomDevice) => {
  if (device.DevicePrivateIP === deviceStore.ip) return 'connected'
  if (deviceStore.connecting) return 'connecting'
  return 'available'
}
</script>

<template>
  <div class="page">
    <h1>Connexion</h1>

    <section class="section">
      <h2>IP manuelle</h2>
      <form class="manual-form" @submit.prevent="handleManualConnect">
        <input
          v-model="manualIp"
          type="text"
          placeholder="192.168.1.xxx"
          :disabled="deviceStore.connecting"
        />
        <button
          class="primary"
          type="submit"
          :disabled="deviceStore.connecting || !manualIp.trim()"
        >
          {{ deviceStore.connecting ? 'Connexion...' : 'Connecter' }}
        </button>
      </form>
      <p v-if="manualError" class="error">{{ manualError }}</p>
    </section>

    <section class="section">
      <div class="section-header">
        <h2>Appareils détectés</h2>
        <button
          class="primary"
          :disabled="deviceStore.discovering"
          @click="deviceStore.discover()"
        >
          {{ deviceStore.discovering ? 'Recherche...' : 'Rechercher' }}
        </button>
      </div>

      <p v-if="deviceStore.error" class="error">{{ deviceStore.error }}</p>

      <div v-if="deviceStore.discoveredDevices.length" class="device-list">
        <DeviceCard
          v-for="device in deviceStore.discoveredDevices"
          :status="getDeviceStatus(device)"
          :key="device.DeviceId"
          :device="device"
          @connect="handleConnect"
        />
      </div>
      <p v-else class="hint">
        Cliquez sur "Rechercher" pour détecter les appareils sur le réseau local.
      </p>
    </section>
  </div>
</template>

<style scoped>
.section {
  margin-bottom: 1.5rem;
}

.section h2 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
  color: var(--color-text-secondary);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.section-header h2 {
  margin-bottom: 0;
}

.manual-form {
  display: flex;
  gap: 0.5rem;
}

.manual-form input {
  flex: 1;
  max-width: 250px;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error {
  color: var(--color-danger);
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.hint {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}
</style>
