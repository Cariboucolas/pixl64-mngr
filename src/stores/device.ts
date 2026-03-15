import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { DivoomClient } from '../services/divoom/client'
import * as commands from '../services/divoom/commands'
import { discoverDevices, validateDevice } from '../services/divoom/discovery'
import type {
  DeviceResponse,
  DeviceSettings,
  DivoomDevice,
} from '../services/divoom/types'

export const useDeviceStore = defineStore('device', () => {
  const ip = ref('')
  const connected = ref(false)
  const connecting = ref(false)
  const error = ref<string | null>(null)
  const brightness = ref(100)
  const channel = ref(0)
  const screenOn = ref(true)
  const discoveredDevices = ref<DivoomDevice[]>([])
  const discovering = ref(false)

  let client: DivoomClient | null = null

  const isReady = computed(() => connected.value && client !== null)

  const connect = async (deviceIp: string): Promise<void> => {
    connecting.value = true
    error.value = null

    try {
      const valid = await validateDevice(deviceIp)
      if (!valid) {
        throw new Error(`Aucun appareil Divoom trouvé à ${deviceIp}`)
      }

      client = new DivoomClient(deviceIp)
      ip.value = deviceIp

      const settings = await client.send<DeviceResponse & DeviceSettings>(
        commands.getDeviceSettings(),
      )

      brightness.value = settings.Brightness ?? 100
      screenOn.value = (settings.LightSwitch ?? 1) === 1
      connected.value = true
    } catch (e) {
      client = null
      connected.value = false
      error.value = e instanceof Error ? e.message : 'Erreur de connexion'
      throw e
    } finally {
      connecting.value = false
    }
  }

  const disconnect = (): void => {
    client = null
    connected.value = false
    ip.value = ''
    error.value = null
  }

  const setBrightness = async (value: number): Promise<void> => {
    if (!client) return
    await client.send(commands.setBrightness(value))
    brightness.value = value
  }

  const setChannel = async (index: number): Promise<void> => {
    if (!client) return
    await client.send(commands.setChannel(index))
    channel.value = index
  }

  const togglePower = async (): Promise<void> => {
    if (!client) return
    const newState = !screenOn.value
    await client.send(commands.powerOnOff(newState))
    screenOn.value = newState
  }

  const discover = async (): Promise<void> => {
    discovering.value = true
    error.value = null
    try {
      discoveredDevices.value = await discoverDevices()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur de découverte'
      discoveredDevices.value = []
    } finally {
      discovering.value = false
    }
  }

  const getClient = (): DivoomClient | null => client

  return {
    ip,
    connected,
    connecting,
    error,
    brightness,
    channel,
    screenOn,
    discoveredDevices,
    discovering,
    isReady,
    connect,
    disconnect,
    setBrightness,
    setChannel,
    togglePower,
    discover,
    getClient,
  }
})
