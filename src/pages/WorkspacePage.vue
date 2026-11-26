<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import TabBar, { type Tab } from '../components/molecules/TabBar.vue'
import DevicePanel from '../components/organisms/DevicePanel.vue'
import WorkspaceTemplate from '../components/templates/WorkspaceTemplate.vue'
import { switchLocale } from '../i18n'
import { deviceErrorMessage } from '../services/divoom/deviceError'
import { useDeviceStore } from '../stores/device'

const { t, locale } = useI18n()
const router = useRouter()
const deviceStore = useDeviceStore()
const panelError = ref<string | null>(null)

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

/** Runs a setting change and shows why it failed, if it did. */
const apply = async (change: () => Promise<void>) => {
  panelError.value = null
  try {
    await change()
  } catch (e) {
    panelError.value = deviceErrorMessage(e)
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
        :connected="deviceStore.connected"
        :brightness="deviceStore.brightness"
        :screen-on="deviceStore.screenOn"
        :channel="deviceStore.channel"
        :error="panelError"
        :locale="locale"
        @brightness="apply(() => deviceStore.setBrightness($event))"
        @channel="apply(() => deviceStore.setChannel($event))"
        @toggle-power="apply(() => deviceStore.togglePower())"
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
