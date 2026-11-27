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
  /** Every exchange fails with this error; `null` lets them through again. */
  failWith(error: unknown): void
  /** Only this command fails. */
  failOn(command: string, error: unknown): void
  discovers(devices: DivoomDevice[]): void
}

/** Stands in for the device in tests: records what is sent, answers what it was told to. */
export const createFakeGateway = (): FakeGateway => {
  const sent: SentCommand[] = []
  const replies = new Map<string, DeviceReply>()
  let failure: unknown = null
  const commandFailures = new Map<string, unknown>()
  let devices: DivoomDevice[] = []

  return {
    sent,
    replyTo: (command, reply) => {
      replies.set(command, reply)
    },
    failWith: (error) => {
      failure = error
    },
    failOn: (command, error) => {
      commandFailures.set(command, error)
    },
    discovers: (found) => {
      devices = found
    },
    send: async <T extends DeviceReply>(
      ip: string,
      payload: CommandPayload,
    ) => {
      if (failure) throw failure
      if (commandFailures.has(payload.Command)) {
        throw commandFailures.get(payload.Command)
      }
      sent.push({ ip, payload })
      return (replies.get(payload.Command) ?? { error_code: 0 }) as T
    },
    discover: async () => {
      if (failure) throw failure
      return devices
    },
  }
}
