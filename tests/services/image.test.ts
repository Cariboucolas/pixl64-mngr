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

    // Then — aucun clipping, on lit toute la source et on la dessine telle quelle
    expect(params.readX).toBe(0)
    expect(params.readY).toBe(0)
    expect(params.readWidth).toBe(50)
    expect(params.readHeight).toBe(50)
    expect(params.drawX).toBe(0)
    expect(params.drawY).toBe(0)
    expect(params.drawWidth).toBe(50)
    expect(params.drawHeight).toBe(50)
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

    // Then — on ne lit que 64px de la source (le reste déborde)
    expect(params.readX).toBe(0)
    expect(params.readY).toBe(0)
    expect(params.readWidth).toBe(64)
    expect(params.readHeight).toBe(64)
    expect(params.drawX).toBe(0)
    expect(params.drawY).toBe(0)
    expect(params.drawWidth).toBe(64)
    expect(params.drawHeight).toBe(64)
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

    // Then — le clipping compense l'offset négatif
    expect(params.readX).toBe(20)
    expect(params.readY).toBe(10)
    expect(params.readWidth).toBe(64)
    expect(params.readHeight).toBe(64)
    expect(params.drawX).toBe(0)
    expect(params.drawY).toBe(0)
    expect(params.drawWidth).toBe(64)
    expect(params.drawHeight).toBe(64)
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

    // Then — l'image zoomée (100x100) est clippée à 64x64
    expect(params.readX).toBe(0)
    expect(params.readY).toBe(0)
    expect(params.readWidth).toBe(32)
    expect(params.readHeight).toBe(32)
    expect(params.drawX).toBe(0)
    expect(params.drawY).toBe(0)
    expect(params.drawWidth).toBe(64)
    expect(params.drawHeight).toBe(64)
  })
})
