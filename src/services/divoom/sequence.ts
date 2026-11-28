import { i18n } from '../../i18n'
import * as commands from './commands'
import type { DeviceLink } from './gateway'
import { encodeFrame } from './image'

/** One image as the device shows it: RGBA pixels, left to right then top to bottom. */
export type Frame = Pick<ImageData, 'data' | 'width' | 'height'>

/** A still (one frame) or an animation: what is sent, shown and saved. */
export interface Sequence {
  frames: Frame[]
  /** How long each frame stays on screen (`PicSpeed`). */
  frameDurationMs: number
}

/** Side of the device screen, in pixels. */
export const FRAME_SIDE = 64
/** `Draw/SendHttpGif` takes fewer than 60 frames per animation. */
export const MAX_FRAMES = 59
/** Channel the device is put on before a sequence is sent. */
export const SEND_CHANNEL = 4
/** A still has no pace; the device still wants one. */
export const STILL_DURATION_MS = 100
/** The identifier counter is reset before each send, so every send is number 1. */
const PIC_ID = 1

export const still = (frame: Frame): Sequence => ({
  frames: [frame],
  frameDurationMs: STILL_DURATION_MS,
})

/** Turns the RGB bytes of a square frame (`PicData`, Base64) back into pixels. */
export const decodeFrame = (picData: string): Frame => {
  const rgb = atob(picData)
  const side = Math.round(Math.sqrt(rgb.length / 3))
  const data = new Uint8ClampedArray(side * side * 4)
  for (let i = 0; i < side * side; i++) {
    data[i * 4] = rgb.charCodeAt(i * 3)
    data[i * 4 + 1] = rgb.charCodeAt(i * 3 + 1)
    data[i * 4 + 2] = rgb.charCodeAt(i * 3 + 2)
    data[i * 4 + 3] = 255
  }
  return { data, width: side, height: side }
}

/** The user stopped a send before its last frame. */
export class SendCancelled extends Error {
  constructor() {
    super(i18n.global.t('errors.send.cancelled'))
    this.name = 'SendCancelled'
  }
}

export interface SendOptions {
  /** Called after each frame the device accepted. */
  onProgress?: (sent: number, total: number) => void
  /** Aborting it stops the send before the next frame. */
  signal?: AbortSignal
}

/** Sends a sequence frame by frame; the device plays it in a loop once it has them all. */
export const sendSequence = async (
  link: DeviceLink,
  { frames, frameDurationMs }: Sequence,
  { onProgress, signal }: SendOptions = {},
): Promise<void> => {
  if (frames.length === 0 || frames.length > MAX_FRAMES) {
    throw new Error(
      i18n.global.t('errors.send.frameCount', { max: MAX_FRAMES }),
    )
  }
  const stopIfCancelled = () => {
    if (signal?.aborted) throw new SendCancelled()
  }

  stopIfCancelled()
  await link.send(commands.resetHttpGifId())
  await link.send(commands.clearHttpText())
  await link.send(commands.setChannel(SEND_CHANNEL))

  for (const [offset, frame] of frames.entries()) {
    stopIfCancelled()
    await link.send(
      commands.sendHttpGif(
        encodeFrame(frame),
        PIC_ID,
        offset,
        frames.length,
        frameDurationMs,
        frame.width,
      ),
    )
    onProgress?.(offset + 1, frames.length)
  }
}
