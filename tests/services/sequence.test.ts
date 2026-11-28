import { describe, expect, it } from 'vitest'
import type { DeviceLink } from '../../src/services/divoom/gateway'
import {
  decodeFrame,
  type Frame,
  SendCancelled,
  sendSequence,
  still,
} from '../../src/services/divoom/sequence'
import type { CommandPayload } from '../../src/services/divoom/types'

const frameOf = (rgb: [number, number, number]): Frame => ({
  data: new Uint8ClampedArray([...rgb, 255]),
  width: 1,
  height: 1,
})

const recordingLink = () => {
  const sent: CommandPayload[] = []
  const link: DeviceLink = {
    send: async <T>(payload: CommandPayload) => {
      sent.push(payload)
      return { error_code: 0 } as T
    },
  }
  return { link, sent }
}

describe('still', () => {
  it('is a sequence of one frame', () => {
    const frame = frameOf([255, 0, 0])

    expect(still(frame).frames).toEqual([frame])
  })
})

describe('decodeFrame', () => {
  it('turns the RGB bytes of a frame into pixels', () => {
    // 2 × 2 : red, green, blue, white
    const picData = btoa(
      String.fromCharCode(255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255),
    )

    const frame = decodeFrame(picData)

    expect(frame.width).toBe(2)
    expect(frame.height).toBe(2)
    expect(Array.from(frame.data)).toEqual([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
    ])
  })
})

describe('sendSequence', () => {
  const animation = {
    frames: [frameOf([255, 0, 0]), frameOf([0, 255, 0]), frameOf([0, 0, 255])],
    frameDurationMs: 80,
  }

  it('prepares the device, then sends every frame in order', async () => {
    const { link, sent } = recordingLink()

    await sendSequence(link, animation)

    expect(sent.map((payload) => payload.Command)).toEqual([
      'Draw/ResetHttpGifId',
      'Draw/ClearHttpText',
      'Channel/SetIndex',
      'Draw/SendHttpGif',
      'Draw/SendHttpGif',
      'Draw/SendHttpGif',
    ])
    expect(sent.slice(3)).toEqual([
      {
        Command: 'Draw/SendHttpGif',
        PicNum: 3,
        PicWidth: 1,
        PicOffset: 0,
        PicID: 1,
        PicSpeed: 80,
        PicData: '/wAA',
      },
      expect.objectContaining({ PicOffset: 1, PicID: 1, PicData: 'AP8A' }),
      expect.objectContaining({ PicOffset: 2, PicID: 1, PicData: 'AAD/' }),
    ])
  })

  it('reports progress after each frame', async () => {
    const { link } = recordingLink()
    const progress: [number, number][] = []

    await sendSequence(link, animation, {
      onProgress: (sent, total) => progress.push([sent, total]),
    })

    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })

  it('stops between two frames when the send is cancelled', async () => {
    const { link, sent } = recordingLink()
    const controller = new AbortController()

    const sending = sendSequence(link, animation, {
      signal: controller.signal,
      onProgress: (count) => {
        if (count === 1) controller.abort()
      },
    })

    await expect(sending).rejects.toBeInstanceOf(SendCancelled)
    expect(
      sent.filter((payload) => payload.Command === 'Draw/SendHttpGif'),
    ).toHaveLength(1)
  })

  it('sends nothing when it is cancelled before it starts', async () => {
    const { link, sent } = recordingLink()
    const controller = new AbortController()
    controller.abort()

    await expect(
      sendSequence(link, animation, { signal: controller.signal }),
    ).rejects.toBeInstanceOf(SendCancelled)
    expect(sent).toEqual([])
  })

  it('refuses a sequence the device cannot play', async () => {
    const { link, sent } = recordingLink()
    const tooLong = {
      frames: Array.from({ length: 60 }, () => frameOf([0, 0, 0])),
      frameDurationMs: 100,
    }

    await expect(sendSequence(link, tooLong)).rejects.toThrow()
    await expect(
      sendSequence(link, { frames: [], frameDurationMs: 100 }),
    ).rejects.toThrow()
    expect(sent).toEqual([])
  })
})
