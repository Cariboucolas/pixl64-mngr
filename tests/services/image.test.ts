import { describe, expect, it } from 'vitest'
import { computeCropParams, encodeFrame } from '../../src/services/divoom/image'

function createTestImageData(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData
}

describe('encodeFrame', () => {
  it('converts RGBA ImageData to base64 RGB', () => {
    const imageData = createTestImageData(2, 2, 255, 0, 0)
    const result = encodeFrame(imageData)

    // 2x2 = 4 pixels x 3 bytes = 12 bytes → base64 = 16 chars
    expect(result).toHaveLength(16)
    expect(typeof result).toBe('string')
  })

  it('encodes 64x64 image to expected base64 length', () => {
    const imageData = createTestImageData(64, 64, 0, 255, 0)
    const result = encodeFrame(imageData)

    // 64x64 x 3 bytes = 12288 bytes → base64 = ceil(12288/3)*4 = 16384
    expect(result).toHaveLength(16384)
  })

  it('strips alpha channel', () => {
    const imageData = createTestImageData(1, 1, 100, 150, 200)
    const result = encodeFrame(imageData)

    // Decode and verify: 3 bytes (RGB) → 4 base64 chars
    const decoded = atob(result)
    expect(decoded.length).toBe(3)
    expect(decoded.charCodeAt(0)).toBe(100)
    expect(decoded.charCodeAt(1)).toBe(150)
    expect(decoded.charCodeAt(2)).toBe(200)
  })
})

describe('computeCropParams', () => {
  it('returns full source when image fits inside output', () => {
    // Given
    const sourceWidth = 50
    const sourceHeight = 50
    const offsetX = 0
    const offsetY = 0
    const scale = 1
    const size = 64

    // When
    const params = computeCropParams(
      sourceWidth,
      sourceHeight,
      offsetX,
      offsetY,
      scale,
      size,
    )

    // Then
    expect(params.sourceX).toBe(0)
    expect(params.sourceY).toBe(0)
    expect(params.sourceWidth).toBe(50)
    expect(params.sourceHeight).toBe(50)
    expect(params.destinationX).toBe(0)
    expect(params.destinationY).toBe(0)
    expect(params.destinationWidth).toBe(64)
    expect(params.destinationHeight).toBe(64)
  })

  it('clips source that overflows the output canvas', () => {
    // Given
    const sourceWidth = 100
    const sourceHeight = 100
    const offsetX = 0
    const offsetY = 0
    const scale = 1
    const size = 64

    // When
    const params = computeCropParams(
      sourceWidth,
      sourceHeight,
      offsetX,
      offsetY,
      scale,
      size,
    )

    // Then
    expect(params.sourceX).toBe(0)
    expect(params.sourceY).toBe(0)
    expect(params.sourceWidth).toBe(64)
    expect(params.sourceHeight).toBe(64)
    expect(params.destinationX).toBe(0)
    expect(params.destinationY).toBe(0)
    expect(params.destinationWidth).toBe(64)
    expect(params.destinationHeight).toBe(64)
  })

  it('clips negative offset (panned left/up)', () => {
    // Given
    const sourceWidth = 100
    const sourceHeight = 100
    const offsetX = -20
    const offsetY = -10
    const scale = 1
    const size = 64

    // When
    const params = computeCropParams(
      sourceWidth,
      sourceHeight,
      offsetX,
      offsetY,
      scale,
      size,
    )

    // Then
    expect(params.sourceX).toBe(20)
    expect(params.sourceY).toBe(10)
    expect(params.sourceWidth).toBe(64)
    expect(params.sourceHeight).toBe(64)
    expect(params.destinationX).toBe(0)
    expect(params.destinationY).toBe(0)
    expect(params.destinationWidth).toBe(64)
    expect(params.destinationHeight).toBe(64)
  })

  it('applies scale correctly', () => {
    // Given
    const sourceWidth = 50
    const sourceHeight = 50
    const offsetX = 0
    const offsetY = 0
    const scale = 2
    const size = 64

    // When
    const params = computeCropParams(
      sourceWidth,
      sourceHeight,
      offsetX,
      offsetY,
      scale,
      size,
    )

    // Then
    expect(params.sourceX).toBe(0)
    expect(params.sourceY).toBe(0)
    expect(params.sourceWidth).toBe(32)
    expect(params.sourceHeight).toBe(32)
    expect(params.destinationX).toBe(0)
    expect(params.destinationY).toBe(0)
    expect(params.destinationWidth).toBe(64)
    expect(params.destinationHeight).toBe(64)
  })
})
