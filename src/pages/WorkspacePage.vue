<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import TabBar, { type Tab } from '../components/molecules/TabBar.vue'
import DevicePanel from '../components/organisms/DevicePanel.vue'
import WorkspaceTemplate from '../components/templates/WorkspaceTemplate.vue'
import { usePolling } from '../composables/usePolling'
import { switchLocale } from '../i18n'
import { deviceErrorMessage } from '../services/divoom/deviceError'
import { useDeviceStore } from '../stores/device'

const { t, locale } = useI18n()
const router = useRouter()
const deviceStore = useDeviceStore()
const panelError = ref<string | null>(null)
const panelRevision = ref(0)

/** How often the device is asked whether it still answers. */
const CONNECTION_CHECK_MS = 10_000

usePolling(() => deviceStore.refresh(), CONNECTION_CHECK_MS)

const tabs = computed<Tab[]>(() => [
  { id: 'library', label: t('tabs.library'), to: 'library' },
  { id: 'new', label: t('tabs.new'), to: 'new' },
  { id: 'faces', label: t('tabs.faces') },
  { id: 'tools', label: t('tabs.tools') },
])

const deviceName = computed(
  () =>
    deviceStore.discoveredDevices.find(
      (device) => device.DevicePrivateIP === deviceStore.ip,
    )?.DeviceName ?? null,
)

/**
 * Runs a setting change. If it fails, says why, puts the controls back on the
 * previous values and checks whether the device still answers.
 */
const apply = async (change: () => Promise<void>) => {
  panelError.value = null
  try {
    await change()
  } catch (e) {
    panelError.value = deviceErrorMessage(e)
    panelRevision.value++
    await deviceStore.refresh()
  }
}

const changeDevice = async () => {
  deviceStore.disconnect()
  await router.push({ name: 'connect' })
}

const toggleLocale = () => {
  switchLocale(locale.value === 'fr' ? 'en' : 'fr')
}
</script>

<template>
  <WorkspaceTemplate>
    <template #panel>
      <DevicePanel
        :frame="deviceStore.lastFrame"
        :device-name="deviceName"
        :ip="deviceStore.ip"
        :lost="deviceStore.lost"
        :brightness="deviceStore.brightness"
        :screen-on="deviceStore.screenOn"
        :channel="deviceStore.channel"
        :rotation="deviceStore.rotation"
        :mirrored="deviceStore.mirrored"
        :time24="deviceStore.time24"
        :white-balance="deviceStore.whiteBalance"
        :error="panelError"
        :revision="panelRevision"
        :locale="locale"
        @brightness="apply(() => deviceStore.setBrightness($event))"
        @channel="apply(() => deviceStore.setChannel($event))"
        @toggle-power="apply(() => deviceStore.togglePower())"
        @rotation="apply(() => deviceStore.setRotation($event))"
        @toggle-mirror="apply(() => deviceStore.setMirror(!deviceStore.mirrored))"
        @time24="apply(() => deviceStore.setTime24($event))"
        @white-balance="apply(() => deviceStore.setWhiteBalance($event))"
        @reconnect="deviceStore.refresh()"
        @change-device="changeDevice"
        @toggle-locale="toggleLocale"
      />
    </template>
    <template #tabs>
      <TabBar
        :tabs="tabs"
        :label="t('tabs.label')"
        :unavailable-label="t('tabs.comingSoon')"
      />
    </template>
    <RouterView />
  </WorkspaceTemplate>
</template>
