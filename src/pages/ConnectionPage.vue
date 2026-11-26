<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ConnectionPanel from '../components/organisms/ConnectionPanel.vue'
import CenteredTemplate from '../components/templates/CenteredTemplate.vue'
import { useDeviceStore } from '../stores/device'
import { useSettingsStore } from '../stores/settings'

const { t } = useI18n()
const deviceStore = useDeviceStore()
const settingsStore = useSettingsStore()
const router = useRouter()
const manualIp = ref(settingsStore.lastDeviceIp)

const connect = async (ip: string) => {
  try {
    await deviceStore.connect(ip)
  } catch {
    // The store holds the message shown by the panel.
    return
  }
  settingsStore.lastDeviceIp = ip
  await router.push({ name: 'library' })
}

onMounted(async () => {
  await settingsStore.hydrate()
  manualIp.value = settingsStore.lastDeviceIp

  // Once per launch: coming back here to change device must not reconnect.
  if (settingsStore.autoConnectAttempted) return
  settingsStore.autoConnectAttempted = true

  if (settingsStore.autoConnect && settingsStore.lastDeviceIp) {
    await connect(settingsStore.lastDeviceIp)
  }
})
</script>

<template>
  <CenteredTemplate :title="t('connection.title')">
    <ConnectionPanel
      v-model:manual-ip="manualIp"
      :devices="deviceStore.discoveredDevices"
      :connected-ip="deviceStore.ip"
      :connecting="deviceStore.connecting"
      :discovering="deviceStore.discovering"
      :has-discovered="deviceStore.hasDiscovered"
      :error="deviceStore.error"
      @connect="connect"
      @discover="deviceStore.discover()"
    />
  </CenteredTemplate>
</template>
