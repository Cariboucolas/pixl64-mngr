import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import * as storage from '../services/storage'

export interface AppSettings {
  lastDeviceIp: string
  autoConnect: boolean
  defaultBrightness: number
}

const STORAGE_KEY = 'appSettings'

const defaults: AppSettings = {
  lastDeviceIp: '',
  autoConnect: true,
  defaultBrightness: 80,
}

export const useSettingsStore = defineStore('settings', () => {
  const lastDeviceIp = ref(defaults.lastDeviceIp)
  const autoConnect = ref(defaults.autoConnect)
  const defaultBrightness = ref(defaults.defaultBrightness)
  const loaded = ref(false)

  let saveTimeout: ReturnType<typeof setTimeout> | null = null

  async function hydrate(): Promise<void> {
    const saved = await storage.get<AppSettings>(STORAGE_KEY)
    if (saved) {
      lastDeviceIp.value = saved.lastDeviceIp ?? defaults.lastDeviceIp
      autoConnect.value = saved.autoConnect ?? defaults.autoConnect
      defaultBrightness.value =
        saved.defaultBrightness ?? defaults.defaultBrightness
    }
    loaded.value = true
  }

  function persist(): void {
    if (!loaded.value) return
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      storage.set(STORAGE_KEY, {
        lastDeviceIp: lastDeviceIp.value,
        autoConnect: autoConnect.value,
        defaultBrightness: defaultBrightness.value,
      })
    }, 500)
  }

  watch([lastDeviceIp, autoConnect, defaultBrightness], persist)

  return {
    lastDeviceIp,
    autoConnect,
    defaultBrightness,
    loaded,
    hydrate,
  }
})
