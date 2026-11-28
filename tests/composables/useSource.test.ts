// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { useSource } from '../../src/composables/useSource'
import type { Frame } from '../../src/services/divoom/sequence'
import type {
  RenderedAnimation,
  SourceGateway,
} from '../../src/services/source/gateway'

const PIC = btoa('ÿ\u0000\u0000') // one red pixel
const cropped: Frame = {
  data: new Uint8ClampedArray([1, 2, 3, 255]),
  width: 1,
  height: 1,
}
const CROP = { offsetX: 0, offsetY: 0, scale: 1 }
const image = {} as HTMLImageElement

const gatewayWith = (
  frameCount: number,
  render: SourceGateway['render'] = async () => rendered(frameCount),
): SourceGateway => ({
  openFile: async () => ({ width: 4, height: 4, frameCount, firstFrame: '' }),
  openUrl: async () => ({ width: 4, height: 4, frameCount, firstFrame: '' }),
  render,
  checkDirectPlay: async () => {},
})

const rendered = (
  count: number,
  sourceFrameCount = count,
): RenderedAnimation => ({
  frames: Array.from({ length: count }, () => PIC),
  frameDurationMs: 80,
  sourceFrameCount,
})

const open = (gateway: SourceGateway) =>
  useSource({ gateway, loadImage: async () => image })

describe('useSource', () => {
  it('shows the first frame of an opened file', async () => {
    const source = open(gatewayWith(1))

    await source.openFile(new Uint8Array([1]))

    expect(source.image.value).toBe(image)
    expect(source.animated.value).toBe(false)
    expect(source.error.value).toBeNull()
  })

  it('makes a still of the cropped frame when the source has one image', async () => {
    const source = open(gatewayWith(1))
    await source.openFile(new Uint8Array([1]))

    await source.setCrop(cropped, CROP)

    expect(source.sequence.value?.frames).toEqual([cropped])
  })

  it('renders every frame of an animated source under the crop', async () => {
    const source = open(gatewayWith(3))
    await source.openUrl('https://example.com/a.gif')

    await source.setCrop(cropped, CROP)

    expect(source.animated.value).toBe(true)
    expect(source.sequence.value?.frames).toHaveLength(3)
    expect(Array.from(source.sequence.value?.frames[0].data ?? [])).toEqual([
      255, 0, 0, 255,
    ])
    expect(source.sequence.value?.frameDurationMs).toBe(80)
    expect(source.reducedFrom.value).toBeNull()
  })

  it('tells when frames were dropped', async () => {
    const source = open(gatewayWith(120, async () => rendered(59, 120)))
    await source.openFile(new Uint8Array([1]))

    await source.setCrop(cropped, CROP)

    expect(source.reducedFrom.value).toBe(120)
  })

  it('keeps the pace the user chose when the crop changes', async () => {
    const source = open(gatewayWith(3))
    await source.openFile(new Uint8Array([1]))
    await source.setCrop(cropped, CROP)

    source.setFrameDuration(200)
    await source.setCrop(cropped, { ...CROP, scale: 2 })

    expect(source.sequence.value?.frameDurationMs).toBe(200)
  })

  it('ignores a render that a newer crop made obsolete', async () => {
    const pending: ((value: RenderedAnimation) => void)[] = []
    const source = open(
      gatewayWith(3, () => new Promise((resolve) => pending.push(resolve))),
    )
    await source.openFile(new Uint8Array([1]))

    const first = source.setCrop(cropped, CROP)
    const second = source.setCrop(cropped, { ...CROP, scale: 2 })
    pending[1](rendered(3))
    await second
    pending[0](rendered(2))
    await first

    expect(source.sequence.value?.frames).toHaveLength(3)
  })

  it('says why a source could not be opened and forgets the previous one', async () => {
    const source = open(gatewayWith(1))
    await source.openFile(new Uint8Array([1]))
    await source.setCrop(cropped, CROP)
    const failing = open({
      ...gatewayWith(1),
      openFile: async () => {
        throw { kind: 'unsupported' }
      },
    })

    await failing.openFile(new Uint8Array([1]))

    expect(failing.error.value).toContain('GIF')
    expect(failing.image.value).toBeNull()
    expect(failing.sequence.value).toBeNull()
  })
})
