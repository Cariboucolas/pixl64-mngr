import { fetch } from '@tauri-apps/plugin-http'
import { i18n } from '../../i18n'
import type { DeviceResponse, DiscoveryResponse, DivoomDevice } from './types'

const DISCOVERY_URL = 'https://app.divoom-gz.com/Device/ReturnSameLANDevice'

export const discoverDevices = async (): Promise<DivoomDevice[]> => {
  const response = await fetch(DISCOVERY_URL, { method: 'POST' })

  if (!response.ok) {
    throw new Error(
      i18n.global.t('errors.discovery.httpFailed', { status: response.status }),
    )
  }

  const data = (await response.json()) as DiscoveryResponse

  if (data.ReturnCode !== 0) {
    throw new Error(
      i18n.global.t('errors.discovery.apiFailed', {
        message: data.ReturnMessage,
      }),
    )
  }

  return data.DeviceList ?? []
}

export const validateDevice = async (ip: string): Promise<boolean> => {
  try {
    const response = await fetch(`http://${ip}:80/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Command: 'Channel/GetAllConf' }),
    })

    if (!response.ok) return false

    const data = (await response.json()) as DeviceResponse
    return data.error_code === 0
  } catch {
    return false
  }
}
