import type { DeviceGateway } from '../../src/services/divoom/gateway'
import type {
  CommandPayload,
  DeviceReply,
  DivoomDevice,
} from '../../src/services/divoom/types'

export interface SentCommand {
  ip: string
  payload: CommandPayload
}

export interface FakeGateway extends DeviceGateway {
  readonly sent: SentCommand[]
  replyTo(command: string, reply: DeviceReply): void
  failWith(error: unknown): void
  discovers(devices: DivoomDevice[]): void
}

/** Stands in for the device in tests: records what is sent, answers what it was told to. */
export const createFakeGateway = (): FakeGateway => {
  const sent: SentCommand[] = []
  const replies = new Map<string, DeviceReply>()
  let failure: unknown = null
  let devices: DivoomDevice[] = []

  return {
    sent,
    replyTo: (command, reply) => {
      replies.set(command, reply)
    },
    failWith: (error) => {
      failure = error
    },
    discovers: (found) => {
      devices = found
    },
    send: async <T extends DeviceReply>(
      ip: string,
      payload: CommandPayload,
    ) => {
      if (failure) throw failure
      sent.push({ ip, payload })
      return (replies.get(payload.Command) ?? { error_code: 0 }) as T
    },
    discover: async () => {
      if (failure) throw failure
      return devices
    },
  }
}
