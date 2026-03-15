import type { DivoomClient } from './client'
import * as commands from './commands'

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
