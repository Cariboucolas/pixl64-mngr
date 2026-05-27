// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  clampOffset,
  clampScale,
  computeCropParams,
  encodeFrame,
  extractCrop,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGE_DIMENSION,
  validateImageDimensions,
  validateImageResponse,
  validateImageUrl,
} from '../../src/services/divoom/image'

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

describe('clampScale', () => {
  it('returns scale unchanged when within bounds', () => {
    expect(clampScale(1.0, 0.1, 20)).toBe(1.0)
  })

  it('clamps to min when below', () => {
    expect(clampScale(0.05, 0.1, 20)).toBe(0.1)
  })

  it('clamps to max when above', () => {
    expect(clampScale(50, 0.1, 20)).toBe(20)
  })

  it('returns min when scale equals min', () => {
    expect(clampScale(0.1, 0.1, 20)).toBe(0.1)
  })

  it('returns max when scale equals max', () => {
    expect(clampScale(20, 0.1, 20)).toBe(20)
  })
})

describe('clampOffset', () => {
  it('centers when image is smaller than canvas', () => {
    // image 100px dans canvas 300px → centré, offset = 100
    expect(clampOffset(50, 100, 300)).toBe(100)
    expect(clampOffset(-200, 100, 300)).toBe(100)
  })

  it('clamps to right edge when image is larger and offset too negative', () => {
    // image 500px dans canvas 300px → min offset = -200 (image alignée à droite)
    expect(clampOffset(-1000, 500, 300)).toBe(-200)
  })

  it('clamps to left edge when image is larger and offset positive', () => {
    // image 500px dans canvas 300px → max offset = 0 (image alignée à gauche)
    expect(clampOffset(50, 500, 300)).toBe(0)
  })

  it('preserves offset when image is larger and offset within bounds', () => {
    expect(clampOffset(-100, 500, 300)).toBe(-100)
  })
})

describe('validateImageResponse', () => {
  it('throws on non-ok response', async () => {
    // Given
    const response = new Response(null, { status: 404 })
    // When & Then
    await expect(validateImageResponse(response)).rejects.toThrow('404')
  })

  it('throws on non-image content-type', async () => {
    // Given
    const response = new Response(null, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    })
    // When & Then
    await expect(validateImageResponse(response)).rejects.toThrow(
      "L'URL ne pointe pas vers une image",
    )
  })

  it('throws when file too large', async () => {
    // Given
    const tooBig = new ArrayBuffer(MAX_FILE_SIZE_BYTES + 1)
    const response = new Response(tooBig, {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })
    // When & Then
    await expect(validateImageResponse(response)).rejects.toThrow(
      'trop volumineuse',
    )
  })

  it('returns buffer on valid response', async () => {
    // Given
    const valid = new ArrayBuffer(100)
    const response = new Response(valid, {
      status: 200,
      headers: { 'content-type': 'image/png' },
    })
    // When
    const result = await validateImageResponse(response)

    // Then
    expect(result.byteLength).toBe(100)
  })
})

describe('validateImageDimensions', () => {
  it('throws when width exceeds max', () => {
    // Given
    const img = {
      naturalWidth: MAX_IMAGE_DIMENSION + 1,
      naturalHeight: 100,
    } as HTMLImageElement
    // When & Then
    expect(() => validateImageDimensions(img)).toThrow('dimensions maximales')
  })

  it('throws when height exceeds max', () => {
    // Given
    const img = {
      naturalWidth: 100,
      naturalHeight: MAX_IMAGE_DIMENSION + 1,
    } as HTMLImageElement
    // When & Then
    expect(() => validateImageDimensions(img)).toThrow('dimensions maximales')
  })

  it('does not throw when dimensions are within bounds', () => {
    // Given
    const img = { naturalWidth: 1920, naturalHeight: 1080 } as HTMLImageElement
    // When & Then
    expect(() => validateImageDimensions(img)).not.toThrow()
  })
})

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

    // Then — no clipping, We read the entire source image and draw it exactly as it is
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

    // Then — Only 64px of the source image is displayed (the rest is cut off)
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

    // Then — The negative offset was compensated by clipping
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

    // Then — The zoomed-in image (100x100) is cropped to 64x64
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

describe('extractCrop', () => {
  it('calls drawImage with computed crop params', () => {
    //  Given — we create a mock canvas
    const mockDrawImage = vi.fn()
    const mockGetImageData = vi.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    }))
    const mockCtx = {
      drawImage: mockDrawImage,
      getImageData: mockGetImageData,
      imageSmoothingEnabled: true,
    }

    vi.spyOn(document, 'createElement').mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => mockCtx,
    } as unknown as HTMLCanvasElement)

    const fakeSource = {
      naturalHeight: 80,
      naturalWidth: 100,
      width: 100,
      height: 80,
    } as HTMLImageElement

    // When
    extractCrop(fakeSource, 10, 20, 1.5, 64)

    // Then
    expect(mockDrawImage).toHaveBeenCalledOnce()
    const args = mockDrawImage.mock.calls[0]
    expect(args[0]).toBe(fakeSource)

    const expected = computeCropParams(100, 80, 10, 20, 1.5, 64)
    expect(args[1]).toBe(expected.readX)
    expect(args[2]).toBe(expected.readY)
    expect(args[3]).toBe(expected.readWidth)
    expect(args[4]).toBe(expected.readHeight)
    expect(args[5]).toBe(expected.drawX)
    expect(args[6]).toBe(expected.drawY)
    expect(args[7]).toBe(expected.drawWidth)
    expect(args[8]).toBe(expected.drawHeight)

    vi.restoreAllMocks()
  })
})

describe('validateImageUrl', () => {
  it('returns a URL object for valid https URL', () => {
    const result = validateImageUrl('https://example.com/cat.png')

    expect(result).toBeInstanceOf(URL)
    expect(result.protocol).toBe('https:')
  })

  it.each(['', 'not a url', 'http//missing-colon'])(
    'throws on malformed URL: %s',
    (url) => {
      expect(() => validateImageUrl(url)).toThrow(/invalide|malform/i)
    },
  )

  it.each([
    'http://example.com/cat.png',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:image/png;base64,abc',
    'ftp://example.com/',
  ])('rejects non-https protocol: %s', (url) => {
    expect(() => validateImageUrl(url)).toThrow(/https/i)
  })

  it.each(['https://localhost/', 'https://127.0.0.1/', 'https://[::1]/'])(
    'rejects loopback host: %s',
    (url) => {
      expect(() => validateImageUrl(url)).toThrow(/loopback|local/i)
    },
  )

  it.each([
    'https://10.0.0.1/',
    'https://192.168.1.1/',
    'https://172.16.0.1/',
  ])('rejects RFC1918 private IP: %s', (url) => {
    expect(() => validateImageUrl(url)).toThrow(/priv/i)
  })

  it('rejects IPv4 link-local (169.254.x.x)', () => {
    expect(() => validateImageUrl('https://169.254.0.1/')).toThrow(/link-local/i)
  })

  it('rejects .local mDNS hostnames', () => {
    expect(() => validateImageUrl('https://mydevice.local/')).toThrow(/local/i)
  })

  it('rejects IPv4 written as decimal integer', () => {
    // URL parser normalizes 2130706433 → 127.0.0.1, so the rejection
    // comes from the loopback branch in practice. Either reason is OK:
    // the goal is that the URL is refused.
    expect(() => validateImageUrl('https://2130706433/')).toThrow(
      /loopback|décimal|decimal/i,
    )
  })

  it('rejects IPv4-mapped IPv6', () => {
    expect(() => validateImageUrl('https://[::ffff:127.0.0.1]/')).toThrow(
      /mapped/i,
    )
  })
})
