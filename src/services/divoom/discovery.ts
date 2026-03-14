import { fetch } from '@tauri-apps/plugin-http'
import type { DeviceResponse, DiscoveryResponse, DivoomDevice } from './types'

const DISCOVERY_URL = 'https://app.divoom-gz.com/Device/ReturnSameLANDevice'

export async function discoverDevices(): Promise<DivoomDevice[]> {
  const response = await fetch(DISCOVERY_URL, { method: 'POST' })

  if (!response.ok) {
    throw new Error(`Discovery failed: HTTP ${response.status}`)
  }

  const data = (await response.json()) as DiscoveryResponse

  if (data.ReturnCode !== 0) {
    throw new Error(`Discovery failed: ${data.ReturnMessage}`)
  }

  return data.DeviceList ?? []
}

export async function validateDevice(ip: string): Promise<boolean> {
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
