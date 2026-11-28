import ipaddr from 'ipaddr.js'
import { i18n } from '../../i18n'
import type { Frame } from './sequence'

const t = (key: string, params?: Record<string, unknown>): string =>
  i18n.global.t(key, params ?? {})

export const validateImageUrl = (rawUrl: string): URL => {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error(t('errors.url.invalid'))
  }

  if (url.protocol !== 'https:') {
    throw new Error(t('errors.url.nonHttps'))
  }

  // IPv6 hostnames are bracketed in URLs: [::1] → ::1
  const hostname = url.hostname.replace(/^\[|\]$/g, '')

  if (hostname === 'localhost') {
    throw new Error(t('errors.url.localhost'))
  }

  if (hostname.endsWith('.local')) {
    throw new Error(t('errors.url.mdns'))
  }

  // Decimal IPv4 like 2130706433 (= 127.0.0.1) — bypasses dotted-IP checks
  if (/^\d+$/.test(hostname)) {
    throw new Error(t('errors.url.decimalIpv4'))
  }

  if (ipaddr.isValid(hostname)) {
    const range = ipaddr.parse(hostname).range()

    if (range === 'loopback') {
      throw new Error(t('errors.url.loopback'))
    }
    if (range === 'private') {
      throw new Error(t('errors.url.private'))
    }
    if (range === 'linkLocal') {
      throw new Error(t('errors.url.linkLocal'))
    }
    if (range === 'ipv4Mapped') {
      throw new Error(t('errors.url.ipv4Mapped'))
    }
    if (range !== 'unicast') {
      throw new Error(t('errors.url.reservedIp', { range }))
    }
  }

  return url
}

export const encodeFrame = (imageData: Frame): string => {
  const { data, width, height } = imageData
  const rgb = new Uint8Array(width * height * 3)

  for (let i = 0; i < width * height; i++) {
    rgb[i * 3] = data[i * 4] // R
    rgb[i * 3 + 1] = data[i * 4 + 1] // G
    rgb[i * 3 + 2] = data[i * 4 + 2] // B
  }

  return uint8ArrayToBase64(rgb)
}

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export const clampScale = (scale: number, min: number, max: number): number =>
  Math.min(Math.max(scale, min), max)

export const clampOffset = (
  offset: number,
  scaledDimension: number,
  canvasDimension: number,
): number => {
  if (scaledDimension <= canvasDimension) {
    return (canvasDimension - scaledDimension) / 2
  }
  const minOffset = canvasDimension - scaledDimension
  const maxOffset = 0
  return Math.min(Math.max(offset, minOffset), maxOffset)
}

export interface CropDrawParams {
  readX: number
  readY: number
  readWidth: number
  readHeight: number
  drawX: number
  drawY: number
  drawWidth: number
  drawHeight: number
}

export const computeCropParams = (
  sourceWidth: number,
  sourceHeight: number,
  offsetX: number,
  offsetY: number,
  scale: number,
  size: number,
): CropDrawParams => {
  const scaledWidth = sourceWidth * scale
  const scaledHeight = sourceHeight * scale

  const clippedDrawX = Math.max(0, offsetX)
  const clippedDrawY = Math.max(0, offsetY)
  const clippedDrawWidth = Math.min(offsetX + scaledWidth, size) - clippedDrawX
  const clippedDrawHeight =
    Math.min(offsetY + scaledHeight, size) - clippedDrawY

  const readX = (clippedDrawX - offsetX) / scale
  const readY = (clippedDrawY - offsetY) / scale
  const readWidth = clippedDrawWidth / scale
  const readHeight = clippedDrawHeight / scale

  return {
    readX,
    readY,
    readWidth,
    readHeight,
    drawX: clippedDrawX,
    drawY: clippedDrawY,
    drawWidth: clippedDrawWidth,
    drawHeight: clippedDrawHeight,
  }
}

export const extractCrop = (
  source: HTMLImageElement | HTMLCanvasElement,
  offsetX: number,
  offsetY: number,
  scale: number,
  size: number = 64,
): ImageData => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.imageSmoothingEnabled = false

  const sourceWidth =
    source instanceof HTMLImageElement ? source.naturalWidth : source.width
  const sourceHeight =
    source instanceof HTMLImageElement ? source.naturalHeight : source.height

  const params = computeCropParams(
    sourceWidth,
    sourceHeight,
    offsetX,
    offsetY,
    scale,
    size,
  )

  ctx.drawImage(
    source,
    params.readX,
    params.readY,
    params.readWidth,
    params.readHeight,
    params.drawX,
    params.drawY,
    params.drawWidth,
    params.drawHeight,
  )

  return ctx.getImageData(0, 0, size, size)
}
