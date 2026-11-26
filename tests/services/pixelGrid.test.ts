import { describe, expect, it } from 'vitest'
import {
  paintPixelGrid,
  pixelGridMetrics,
} from '../../src/services/preview/pixelGrid'

const frameOf = (
  width: number,
  height: number,
  rgb: [number, number, number],
): ImageData => {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) data.set([...rgb, 255], i * 4)
  return { data, width, height, colorSpace: 'srgb' } as ImageData
}

interface Rect {
  style: string
  x: number
  y: number
  w: number
  h: number
}

const fakeContext = () => {
  const rects: Rect[] = []
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number) {
      rects.push({ style: ctx.fillStyle, x, y, w, h })
    },
  }
  return { ctx, rects }
}

describe('pixelGridMetrics', () => {
  it('sizes the canvas in device pixels', () => {
    expect(pixelGridMetrics(4, 2)).toEqual({ cell: 8, gap: 1, size: 512 })
  })

  it('drops the grid when a pixel is too small to be split', () => {
    expect(pixelGridMetrics(2, 1)).toEqual({ cell: 2, gap: 0, size: 128 })
    expect(pixelGridMetrics(3, 1).gap).toBe(0)
    expect(pixelGridMetrics(2, 2).gap).toBe(1)
  })

  it('never makes a pixel smaller than one device pixel', () => {
    expect(pixelGridMetrics(0.2, 1).cell).toBe(1)
  })
})

describe('paintPixelGrid', () => {
  it('paints every pixel as a square, leaving the grid line black', () => {
    const { ctx, rects } = fakeContext()
    const frame = frameOf(2, 2, [255, 176, 0])

    paintPixelGrid(ctx, frame, { cell: 8, gap: 1, size: 16 })

    expect(rects[0]).toEqual({ style: '#000000', x: 0, y: 0, w: 16, h: 16 })
    expect(rects.slice(1)).toEqual([
      { style: 'rgb(255 176 0)', x: 0, y: 0, w: 7, h: 7 },
      { style: 'rgb(255 176 0)', x: 8, y: 0, w: 7, h: 7 },
      { style: 'rgb(255 176 0)', x: 0, y: 8, w: 7, h: 7 },
      { style: 'rgb(255 176 0)', x: 8, y: 8, w: 7, h: 7 },
    ])
  })

  it('paints unlit pixels when there is no frame', () => {
    const { ctx, rects } = fakeContext()

    paintPixelGrid(ctx, null, { cell: 4, gap: 1, size: 256 })

    expect(rects).toHaveLength(1 + 64 * 64)
    expect(new Set(rects.slice(1).map((r) => r.style)).size).toBe(1)
    expect(rects[1].style).not.toBe('#000000')
  })
})
