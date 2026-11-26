import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as commands from '../services/divoom/commands'
import { deviceErrorMessage } from '../services/divoom/deviceError'
import { type DeviceLink, getDeviceGateway } from '../services/divoom/gateway'
import type {
  DeviceReply,
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
  // Tells "never searched" from "searched and found nothing": both leave the list empty.
  const hasDiscovered = ref(false)

  const linkTo = (deviceIp: string): DeviceLink => ({
    send: (payload) => getDeviceGateway().send(deviceIp, payload),
  })

  const getLink = (): DeviceLink | null =>
    connected.value ? linkTo(ip.value) : null

  const isReady = computed(() => connected.value)

  const connect = async (deviceIp: string): Promise<void> => {
    connecting.value = true
    error.value = null

    try {
      const settings = await linkTo(deviceIp).send<
        DeviceReply & Partial<DeviceSettings>
      >(commands.getDeviceSettings())

      ip.value = deviceIp
      brightness.value = settings.Brightness ?? 100
      screenOn.value = (settings.LightSwitch ?? 1) === 1
      connected.value = true
    } catch (e) {
      connected.value = false
      error.value = deviceErrorMessage(e)
      throw e
    } finally {
      connecting.value = false
    }
  }

  const disconnect = (): void => {
    connected.value = false
    ip.value = ''
    error.value = null
  }

  const setBrightness = async (value: number): Promise<void> => {
    const link = getLink()
    if (!link) return
    await link.send(commands.setBrightness(value))
    brightness.value = value
  }

  const setChannel = async (index: number): Promise<void> => {
    const link = getLink()
    if (!link) return
    await link.send(commands.setChannel(index))
    channel.value = index
  }

  const togglePower = async (): Promise<void> => {
    const link = getLink()
    if (!link) return
    const newState = !screenOn.value
    await link.send(commands.powerOnOff(newState))
    screenOn.value = newState
  }

  const discover = async (): Promise<void> => {
    discovering.value = true
    hasDiscovered.value = false
    error.value = null
    try {
      discoveredDevices.value = await getDeviceGateway().discover()
      hasDiscovered.value = true
    } catch (e) {
      error.value = deviceErrorMessage(e)
      discoveredDevices.value = []
    } finally {
      discovering.value = false
    }
  }

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
    hasDiscovered,
    isReady,
    connect,
    disconnect,
    setBrightness,
    setChannel,
    togglePower,
    discover,
    getLink,
  }
})
