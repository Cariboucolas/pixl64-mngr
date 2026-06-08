<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import DeviceCard from '../components/device/DeviceCard.vue'
import type { DivoomDevice } from '../services/divoom/types.ts'
import { useDeviceStore } from '../stores/device'
import { useSettingsStore } from '../stores/settings'

const { t } = useI18n()
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
    manualError.value =
      e instanceof Error ? e.message : t('connection.errorConnect')
  }
}

onMounted(async () => {
  await settingsStore.hydrate()

  if (
    settingsStore.autoConnect &&
    settingsStore.lastDeviceIp &&
    !deviceStore.connected
  ) {
    await handleConnect(settingsStore.lastDeviceIp)
  }
})

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
    <h1>{{ t('connection.title') }}</h1>

    <section class="section">
      <h2>{{ t('connection.manualIp') }}</h2>
      <form class="manual-form" @submit.prevent="handleManualConnect">
        <input
          v-model="manualIp"
          type="text"
          :placeholder="t('connection.ipPlaceholder')"
          :disabled="deviceStore.connecting"
        />
        <button
          class="primary"
          type="submit"
          :disabled="deviceStore.connecting || !manualIp.trim()"
        >
          {{ deviceStore.connecting ? t('common.connecting') : t('common.connect') }}
        </button>
      </form>
      <p v-if="manualError" class="error">{{ manualError }}</p>
    </section>

    <section class="section">
      <div class="section-header">
        <h2>{{ t('connection.discoveredDevices') }}</h2>
        <button
          class="primary"
          :disabled="deviceStore.discovering"
          @click="deviceStore.discover()"
        >
          {{ deviceStore.discovering ? t('connection.discovering') : t('connection.discover') }}
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
        {{ t('connection.discoverHint') }}
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
