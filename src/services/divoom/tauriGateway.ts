import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import type { DeviceGateway } from './gateway'
import type { CommandPayload, DeviceReply, DivoomDevice } from './types'

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

/** Reaches the device through the native commands, which validate the address. */
export const createTauriGateway = (
  invoke: Invoke = tauriInvoke,
): DeviceGateway => ({
  send: <T extends DeviceReply>(ip: string, payload: CommandPayload) =>
    invoke<T>('device_send', { ip, payload }),
  discover: () => invoke<DivoomDevice[]>('device_discover'),
})
