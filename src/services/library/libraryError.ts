import { i18n } from '../../i18n'
import { deviceErrorMessage } from '../divoom/deviceError'

/** Why the native side could not read or write the library (`LibraryError` in library.rs). */
const LIBRARY_FAILURES: ReadonlySet<string> = new Set([
  'io',
  'corrupt',
  'notFound',
  'invalidFrames',
])

const kindOf = (e: unknown): string | null =>
  typeof e === 'object' &&
  e !== null &&
  'kind' in e &&
  typeof e.kind === 'string'
    ? e.kind
    : null

/** A sentence for the user; sending an item can also fail on the device side. */
export const libraryErrorMessage = (e: unknown): string => {
  const kind = kindOf(e)
  return kind && LIBRARY_FAILURES.has(kind)
    ? i18n.global.t(`errors.library.${kind}`)
    : deviceErrorMessage(e)
}
