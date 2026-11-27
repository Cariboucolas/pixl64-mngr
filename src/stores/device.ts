import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { i18n } from '../i18n'
import * as commands from '../services/divoom/commands'
import { deviceErrorMessage } from '../services/divoom/deviceError'
import { type DeviceLink, getDeviceGateway } from '../services/divoom/gateway'
import { STILL_CHANNEL, sendStaticImage } from '../services/divoom/image'
import {
  type DeviceReply,
  type DeviceSettings,
  type DivoomDevice,
  ROTATION_ANGLES,
  type RotationAngle,
  type WhiteBalance,
} from '../services/divoom/types'

/** What the device shows after power-on: these settings are not kept when it is switched off. */
const NEUTRAL_WHITE_BALANCE: WhiteBalance = { r: 100, g: 100, b: 100 }

export const useDeviceStore = defineStore('device', () => {
  const ip = ref('')
  const connected = ref(false)
  const connecting = ref(false)
  const error = ref<string | null>(null)
  const brightness = ref(100)
  const channel = ref(0)
  const screenOn = ref(true)
  const rotation = ref<RotationAngle>(0)
  const mirrored = ref(false)
  const time24 = ref(true)
  /** The last value sent: the device cannot be asked for it. */
  const whiteBalance = ref<WhiteBalance>(NEUTRAL_WHITE_BALANCE)
  /** The connected device stopped answering; it is still the chosen device. */
  const lost = ref(false)
  let refreshing = false
  const discoveredDevices = ref<DivoomDevice[]>([])
  const discovering = ref(false)
  // Tells "never searched" from "searched and found nothing": both leave the list empty.
  const hasDiscovered = ref(false)
  /** The last frame sent: the app cannot read what the device shows. */
  const lastFrame = shallowRef<ImageData | null>(null)

  const linkTo = (deviceIp: string): DeviceLink => ({
    send: (payload) => getDeviceGateway().send(deviceIp, payload),
  })

  const getLink = (): DeviceLink | null =>
    connected.value ? linkTo(ip.value) : null

  const isReady = computed(() => connected.value)

  /** Reads what the device can tell about itself and mirrors it. */
  const readState = async (link: DeviceLink): Promise<void> => {
    const settings = await link.send<DeviceReply & Partial<DeviceSettings>>(
      commands.getDeviceSettings(),
    )
    const current = await link.send<DeviceReply & { SelectIndex?: number }>(
      commands.getChannel(),
    )

    brightness.value = settings.Brightness ?? 100
    screenOn.value = (settings.LightSwitch ?? 1) === 1
    rotation.value = ROTATION_ANGLES[settings.GyrateAngle ?? 0] ?? 0
    mirrored.value = (settings.MirrorFlag ?? 0) === 1
    time24.value = (settings.Time24Flag ?? 1) === 1
    channel.value = current.SelectIndex ?? 0
  }

  const connect = async (deviceIp: string): Promise<void> => {
    connecting.value = true
    error.value = null

    try {
      await readState(linkTo(deviceIp))

      ip.value = deviceIp
      lost.value = false
      whiteBalance.value = NEUTRAL_WHITE_BALANCE
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
    lastFrame.value = null
    error.value = null
    lost.value = false
  }

  /** Checks that the device still answers and catches up with changes made elsewhere. */
  const refresh = async (): Promise<void> => {
    const link = getLink()
    if (!link || refreshing) return
    refreshing = true
    try {
      await readState(link)
      lost.value = false
    } catch {
      lost.value = true
    } finally {
      refreshing = false
    }
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

  const setRotation = async (angle: RotationAngle): Promise<void> => {
    const link = getLink()
    if (!link) return
    await link.send(commands.setRotation(angle))
    rotation.value = angle
  }

  const setMirror = async (on: boolean): Promise<void> => {
    const link = getLink()
    if (!link) return
    await link.send(commands.setMirror(on))
    mirrored.value = on
  }

  const setTime24 = async (on: boolean): Promise<void> => {
    const link = getLink()
    if (!link) return
    await link.send(commands.setTime24(on))
    time24.value = on
  }

  const setWhiteBalance = async (balance: WhiteBalance): Promise<void> => {
    const link = getLink()
    if (!link) return
    await link.send(commands.setWhiteBalance(balance))
    whiteBalance.value = balance
  }

  const sendStill = async (frame: ImageData): Promise<void> => {
    const link = getLink()
    if (!link) throw new Error(i18n.global.t('errors.device.notConnected'))
    await sendStaticImage(link, frame)
    channel.value = STILL_CHANNEL
    lastFrame.value = frame
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
    rotation,
    mirrored,
    time24,
    whiteBalance,
    lost,
    discoveredDevices,
    discovering,
    hasDiscovered,
    lastFrame,
    isReady,
    connect,
    disconnect,
    setBrightness,
    setChannel,
    togglePower,
    setRotation,
    setMirror,
    setTime24,
    setWhiteBalance,
    refresh,
    sendStill,
    discover,
    getLink,
  }
})
