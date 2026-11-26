/** Side of the device screen, in pixels. */
export const GRID_SIZE = 64

/** Below this many device pixels, a pixel is too small to give one up to the grid. */
const MIN_CELL_WITH_GRID = 4
const GRID_COLOR = '#000000'
const UNLIT_PIXEL_COLOR = '#18181b'

/** Sizes in device pixels: one screen pixel, the grid line taken from it, the whole canvas. */
export interface PixelGridMetrics {
  cell: number
  gap: number
  size: number
}

type Painter = Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>

export const pixelGridMetrics = (
  cssCell: number,
  devicePixelRatio: number,
): PixelGridMetrics => {
  const cell = Math.max(1, Math.round(cssCell * devicePixelRatio))
  return {
    cell,
    gap: cell >= MIN_CELL_WITH_GRID ? 1 : 0,
    size: cell * GRID_SIZE,
  }
}

/** Paints a frame as the device shows it: square pixels on a thin black grid. */
export const paintPixelGrid = (
  ctx: Painter,
  frame: ImageData | null,
  { cell, gap, size }: PixelGridMetrics,
): void => {
  ctx.fillStyle = GRID_COLOR
  ctx.fillRect(0, 0, size, size)

  const width = frame?.width ?? GRID_SIZE
  const height = frame?.height ?? GRID_SIZE
  const side = cell - gap

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (frame) {
        const i = (y * width + x) * 4
        ctx.fillStyle = `rgb(${frame.data[i]} ${frame.data[i + 1]} ${frame.data[i + 2]})`
      } else {
        ctx.fillStyle = UNLIT_PIXEL_COLOR
      }
      ctx.fillRect(x * cell, y * cell, side, side)
    }
  }
}
