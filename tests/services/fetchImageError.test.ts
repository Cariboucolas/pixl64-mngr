// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  type FetchImageError,
  fetchImageErrorMessage,
  isFetchImageError,
} from '../../src/services/divoom/fetchImageError'

describe('isFetchImageError', () => {
  it('returns true for objects with a string kind', () => {
    expect(isFetchImageError({ kind: 'loopback' })).toBe(true)
    expect(
      isFetchImageError({ kind: 'tooLarge', actualBytes: 1, maxBytes: 2 }),
    ).toBe(true)
  })

  it.each([
    null,
    undefined,
    42,
    'kind',
    {},
    { kind: 42 },
    [],
  ])('returns false for non-FetchImageError input: %s', (value) => {
    expect(isFetchImageError(value)).toBe(false)
  })
})

describe('fetchImageErrorMessage', () => {
  it.each<[FetchImageError, RegExp]>([
    [{ kind: 'invalidUrl' }, /invalid/i],
    [{ kind: 'missingHost' }, /invalid/i],
    [{ kind: 'nonHttps' }, /https/i],
    [{ kind: 'localhost' }, /local/i],
    [{ kind: 'mdns' }, /local/i],
    [{ kind: 'loopback' }, /loopback/i],
    [{ kind: 'private' }, /priv/i],
    [{ kind: 'linkLocal' }, /link-local/i],
    [{ kind: 'ipv4Mapped' }, /mapped/i],
    [{ kind: 'reservedIp', range: 'ipv4-reserved' }, /reserv/i],
    [{ kind: 'httpStatus', status: 503 }, /503/],
    [{ kind: 'notImage' }, /not.*image|ne pointe pas/i],
    [
      {
        kind: 'tooLarge',
        actualBytes: 25 * 1024 * 1024,
        maxBytes: 20 * 1024 * 1024,
      },
      /too large|volumineuse/i,
    ],
    [{ kind: 'httpClient', message: 'connect failed' }, /failed/i],
    [{ kind: 'httpRequest', message: 'timeout' }, /failed/i],
    [{ kind: 'httpRead', message: 'eof' }, /failed/i],
    [{ kind: 'missingContentType' }, /failed/i],
  ])('maps %j to translated message matching %s', (error, expectedPattern) => {
    expect(fetchImageErrorMessage(error)).toMatch(expectedPattern)
  })

  it('falls back to Error.message for plain Error', () => {
    expect(fetchImageErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('falls back to generic loading error for unknown shapes', () => {
    expect(fetchImageErrorMessage(null)).toMatch(/loading|chargement/i)
    expect(fetchImageErrorMessage({ unknown: 'shape' })).toMatch(
      /loading|chargement/i,
    )
  })

  it('interpolates tooLarge sizes in MB', () => {
    const message = fetchImageErrorMessage({
      kind: 'tooLarge',
      actualBytes: 25 * 1024 * 1024,
      maxBytes: 20 * 1024 * 1024,
    })
    expect(message).toContain('25.00')
    expect(message).toContain('20')
  })
})
