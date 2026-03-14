import { fetch } from '@tauri-apps/plugin-http'
import type { CommandPayload, DeviceResponse } from './types'
import { DeviceCommandError, DeviceHttpError } from './types'

export class DivoomClient {
  private readonly url: string
  private lastRequestTime = 0
  private readonly minInterval = 35 // ms between requests

  constructor(ip: string) {
    this.url = `http://${ip}:80/post`
  }

  async send<T extends DeviceResponse>(payload: CommandPayload): Promise<T> {
    await this.rateLimit()

    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new DeviceHttpError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
      )
    }

    const data = (await response.json()) as T

    if (data.error_code !== 0) {
      throw new DeviceCommandError(
        `Command "${payload.Command}" failed with error code ${data.error_code}`,
        data.error_code,
      )
    }

    return data
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < this.minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minInterval - elapsed),
      )
    }
    this.lastRequestTime = Date.now()
  }
}
