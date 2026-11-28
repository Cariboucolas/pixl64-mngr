import { i18n } from '../../i18n'
import { fetchImageErrorMessage } from '../divoom/fetchImageError'

/** Why the native side could not use a source (`SourceError` in source.rs). */
const SOURCE_FAILURES: ReadonlySet<string> = new Set([
  'unsupported',
  'invalid',
  'dimensionTooLarge',
  'fileTooLarge',
  'tooManyFrames',
  'noSource',
])

const kindOf = (e: unknown): string | null =>
  typeof e === 'object' &&
  e !== null &&
  'kind' in e &&
  typeof e.kind === 'string'
    ? e.kind
    : null

/** Why a URL cannot be played directly (`GifCheckError` in direct_play.rs). */
const DIRECT_PLAY_FAILURES: ReadonlySet<string> = new Set([
  'unsupportedScheme',
  'tooManyRedirects',
  'notGif',
  'wrongSize',
])

/** A sentence for the user; download failures keep their own messages. */
export const sourceErrorMessage = (e: unknown): string => {
  const kind = kindOf(e)
  if (kind && SOURCE_FAILURES.has(kind)) {
    return i18n.global.t(`errors.source.${kind}`)
  }
  if (kind && DIRECT_PLAY_FAILURES.has(kind)) {
    return i18n.global.t(`errors.directPlay.${kind}`, { ...(e as object) })
  }
  return fetchImageErrorMessage(e)
}
