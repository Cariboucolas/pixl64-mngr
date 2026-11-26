<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DivoomDevice } from '../../services/divoom/types'
import DeviceCard from '../molecules/DeviceCard.vue'

const { t } = useI18n()

const props = defineProps<{
  devices: DivoomDevice[]
  connectedIp: string
  connecting: boolean
  discovering: boolean
  hasDiscovered: boolean
  error: string | null
}>()

const emit = defineEmits<{
  connect: [ip: string]
  discover: []
}>()

const manualIp = defineModel<string>('manualIp', { required: true })

const statusOf = (device: DivoomDevice) => {
  if (device.DevicePrivateIP === props.connectedIp) return 'connected'
  if (props.connecting) return 'connecting'
  return 'available'
}

const connectManually = () => {
  const ip = manualIp.value.trim()
  if (ip) emit('connect', ip)
}
</script>

<template>
  <div class="connection-panel">
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <section>
      <div class="section-header">
        <h2>{{ t('connection.discoveredDevices') }}</h2>
        <button
          class="primary"
          type="button"
          :disabled="discovering"
          @click="$emit('discover')"
        >
          {{ discovering ? t('connection.discovering') : t('connection.discover') }}
        </button>
      </div>

      <div v-if="devices.length" class="device-list">
        <DeviceCard
          v-for="device in devices"
          :key="device.DeviceId"
          :device="device"
          :status="statusOf(device)"
          @connect="$emit('connect', $event)"
        />
      </div>
      <p v-else-if="hasDiscovered" class="hint">
        {{ t('connection.noDevicesFound') }}
      </p>
      <p v-else class="hint">{{ t('connection.discoverHint') }}</p>
    </section>

    <section>
      <h2><label for="manual-ip">{{ t('connection.manualIp') }}</label></h2>
      <form class="manual-form" @submit.prevent="connectManually">
        <input
          id="manual-ip"
          v-model="manualIp"
          type="text"
          :placeholder="t('connection.ipPlaceholder')"
          :disabled="connecting"
        />
        <button type="submit" :disabled="connecting || !manualIp.trim()">
          {{ connecting ? t('common.connecting') : t('common.connect') }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.connection-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.manual-form {
  display: flex;
  gap: var(--space-2);
}

.manual-form input {
  flex: 1;
}
</style>
