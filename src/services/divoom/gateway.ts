import { createTauriGateway } from './tauriGateway'
import type { CommandPayload, DeviceReply, DivoomDevice } from './types'

/** The only way the front reaches a device (ADR-0006). */
export interface DeviceGateway {
  send<T extends DeviceReply = DeviceReply>(
    ip: string,
    payload: CommandPayload,
  ): Promise<T>
  discover(): Promise<DivoomDevice[]>
}

/** A gateway already aimed at one device. */
export interface DeviceLink {
  send<T extends DeviceReply = DeviceReply>(payload: CommandPayload): Promise<T>
}

let current: DeviceGateway = createTauriGateway()

export const getDeviceGateway = (): DeviceGateway => current

/** Swaps the gateway, for tests. */
export const setDeviceGateway = (gateway: DeviceGateway): void => {
  current = gateway
}
