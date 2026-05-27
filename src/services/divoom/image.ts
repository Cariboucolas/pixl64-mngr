import ipaddr from 'ipaddr.js'
import type { DivoomClient } from './client'
import * as commands from './commands'

export const MAX_FILE_SIZE_MB = 20
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
export const MAX_IMAGE_DIMENSION = 10_000

export const validateImageUrl = (rawUrl: string): URL => {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error("L'URL est invalide")
  }

  if (url.protocol !== 'https:') {
    throw new Error('Seules les URLs https:// sont autorisées')
  }

  // IPv6 hostnames are bracketed in URLs: [::1] → ::1
  const hostname = url.hostname.replace(/^\[|\]$/g, '')

  if (hostname === 'localhost') {
    throw new Error('Hostname local (localhost) interdit')
  }

  if (hostname.endsWith('.local')) {
    throw new Error('Hostname mDNS (.local) interdit')
  }

  // Decimal IPv4 like 2130706433 (= 127.0.0.1) — bypasses dotted-IP checks
  if (/^\d+$/.test(hostname)) {
    throw new Error('Notation IPv4 décimale non autorisée')
  }

  if (ipaddr.isValid(hostname)) {
    const range = ipaddr.parse(hostname).range()

    if (range === 'loopback') {
      throw new Error('Adresse loopback non autorisée')
    }
    if (range === 'private') {
      throw new Error('Adresse privée non autorisée')
    }
    if (range === 'linkLocal') {
      throw new Error('Adresse link-local non autorisée')
    }
    if (range === 'ipv4Mapped') {
      throw new Error('IPv4-mapped IPv6 non autorisée')
    }
    if (range !== 'unicast') {
      throw new Error(`Adresse IP réservée non autorisée (${range})`)
    }
  }

  return url
}

export const validateImageResponse = async (
  response: Response,
): Promise<ArrayBuffer> => {
  if (!response.ok) {
    throw new Error(`Erreur HTTP! status: ${response.status}`)
  }
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) {
    throw new Error("L'URL ne pointe pas vers une image")
  }
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    const actualMb = buffer.byteLength / (1024 * 1024)
    throw new Error(
      `L'image est trop volumineuse : ${actualMb.toFixed(2)} MB (maximum : ${MAX_FILE_SIZE_MB} MB).`,
    )
  }
  return buffer
}

export const validateImageDimensions = (img: HTMLImageElement): void => {
  if (
    img.naturalWidth > MAX_IMAGE_DIMENSION ||
    img.naturalHeight > MAX_IMAGE_DIMENSION
  ) {
    throw new Error(
      `L'image dépasse les dimensions maximales de ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}px`,
    )
  }
}

export const encodeFrame = (imageData: ImageData): string => {
  const { data, width, height } = imageData
  const rgb = new Uint8Array(width * height * 3)

  for (let i = 0; i < width * height; i++) {
    rgb[i * 3] = data[i * 4] // R
    rgb[i * 3 + 1] = data[i * 4 + 1] // G
    rgb[i * 3 + 2] = data[i * 4 + 2] // B
  }

  return uint8ArrayToBase64(rgb)
}

export const imageDataToDataUrl = (imageData: ImageData): string => {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

export const dataUrlToImageData = (
  dataUrl: string,
  size: number = 64,
): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, size, size)
      resolve(ctx.getImageData(0, 0, size, size))
    }
    img.onerror = () => reject(new Error("impossible de charger l'image"))
    img.src = dataUrl
  })
}

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export const sendStaticImage = async (
  client: DivoomClient,
  imageData: ImageData,
): Promise<void> => {
  await client.send(commands.resetHttpGifId())
  await client.send(commands.clearHttpText())
  await client.send(commands.setChannel(4))

  const picData = encodeFrame(imageData)
  const payload = commands.sendHttpGif(picData, 1, 0, 1, 100, imageData.width)
  await client.send(payload)
}

export const resizeToCanvas = (
  source: HTMLImageElement | HTMLCanvasElement,
  size: number = 64,
): ImageData => {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, 0, 0, size, size)
  return ctx.getImageData(0, 0, size, size)
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
