import { i18n } from '../../i18n'

export type FetchImageError =
  | { kind: 'invalidUrl' }
  | { kind: 'nonHttps' }
  | { kind: 'missingHost' }
  | { kind: 'localhost' }
  | { kind: 'mdns' }
  | { kind: 'loopback' }
  | { kind: 'private' }
  | { kind: 'linkLocal' }
  | { kind: 'ipv4Mapped' }
  | { kind: 'reservedIp'; range: string }
  | { kind: 'httpClient'; message: string }
  | { kind: 'httpRequest'; message: string }
  | { kind: 'httpStatus'; status: number }
  | { kind: 'missingContentType' }
  | { kind: 'notImage' }
  | { kind: 'httpRead'; message: string }
  | { kind: 'tooLarge'; actualBytes: number; maxBytes: number }

export const isFetchImageError = (value: unknown): value is FetchImageError =>
  typeof value === 'object' &&
  value !== null &&
  'kind' in value &&
  typeof (value as { kind: unknown }).kind === 'string'

const t = (key: string, params?: Record<string, unknown>): string =>
  i18n.global.t(key, params ?? {})

export const fetchImageErrorMessage = (e: unknown): string => {
  if (!isFetchImageError(e)) {
    if (e instanceof Error) return e.message
    return t('send.errorLoading')
  }

  switch (e.kind) {
    case 'invalidUrl':
    case 'missingHost':
      return t('errors.url.invalid')
    case 'nonHttps':
      return t('errors.url.nonHttps')
    case 'localhost':
      return t('errors.url.localhost')
    case 'mdns':
      return t('errors.url.mdns')
    case 'loopback':
      return t('errors.url.loopback')
    case 'private':
      return t('errors.url.private')
    case 'linkLocal':
      return t('errors.url.linkLocal')
    case 'ipv4Mapped':
      return t('errors.url.ipv4Mapped')
    case 'reservedIp':
      return t('errors.url.reservedIp', { range: e.range })
    case 'httpStatus':
      return t('errors.http.status', { status: e.status })
    case 'notImage':
      return t('errors.http.notImage')
    case 'tooLarge': {
      const actualMb = (e.actualBytes / (1024 * 1024)).toFixed(2)
      const maxMb = Math.floor(e.maxBytes / (1024 * 1024))
      return t('errors.http.tooLarge', { actualMb, maxMb })
    }
    case 'httpClient':
    case 'httpRequest':
    case 'httpRead':
    case 'missingContentType':
      return t('errors.image.loadFailed')
  }
}
