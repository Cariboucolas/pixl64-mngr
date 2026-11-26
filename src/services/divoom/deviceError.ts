import { i18n } from '../../i18n'

/** What the native side reports when a device exchange fails (`DeviceError` in divoom.rs). */
export type DeviceFailure =
  | { kind: 'invalidIp' }
  | { kind: 'notPrivateIp' }
  | { kind: 'unreachable'; message: string }
  | { kind: 'httpStatus'; status: number }
  | { kind: 'invalidResponse' }
  | { kind: 'commandRefused'; errorCode: number }

const KINDS: ReadonlySet<string> = new Set<DeviceFailure['kind']>([
  'invalidIp',
  'notPrivateIp',
  'unreachable',
  'httpStatus',
  'invalidResponse',
  'commandRefused',
])

export const isDeviceFailure = (value: unknown): value is DeviceFailure =>
  typeof value === 'object' &&
  value !== null &&
  'kind' in value &&
  typeof value.kind === 'string' &&
  KINDS.has(value.kind)

const t = (key: string, params?: Record<string, unknown>): string =>
  i18n.global.t(key, params ?? {})

export const deviceErrorMessage = (e: unknown): string => {
  if (!isDeviceFailure(e)) {
    if (e instanceof Error) return e.message
    return t('errors.device.unknown')
  }

  switch (e.kind) {
    case 'httpStatus':
      return t('errors.device.httpStatus', { status: e.status })
    case 'commandRefused':
      return t('errors.device.commandRefused', { errorCode: e.errorCode })
    default:
      return t(`errors.device.${e.kind}`)
  }
}
