/** Side of the device screen, in pixels. */
export const GRID_SIZE = 64

/** From this many device pixels per pixel, the grid line is drawn fully black. */
const MIN_CELL_FOR_FULL_GRID = 4
/**
 * Below that, a black line would take too much of each pixel and dim the
 * image: the line is faded so that it weighs like a sixth of the pixel.
 */
const FADED_LINE_WEIGHT = 6
const GRID_COLOR = '#000000'
const UNLIT_PIXEL: Rgb = [24, 24, 27]

type Rgb = readonly [number, number, number]

/**
 * Sizes in device pixels: one screen pixel, the grid line taken from it, the
 * whole canvas. `gridOpacity` is how black that line is, from 0 to 1.
 */
export interface PixelGridMetrics {
  cell: number
  gap: number
  gridOpacity: number
  size: number
}

type Painter = Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>

export const pixelGridMetrics = (
  cssCell: number,
  devicePixelRatio: number,
): PixelGridMetrics => {
  const cell = Math.max(1, Math.round(cssCell * devicePixelRatio))
  const gap = cell > 1 ? 1 : 0
  const gridOpacity =
    gap === 0
      ? 0
      : cell >= MIN_CELL_FOR_FULL_GRID
        ? 1
        : cell / FADED_LINE_WEIGHT
  return { cell, gap, gridOpacity, size: cell * GRID_SIZE }
}

const css = ([r, g, b]: Rgb): string => `rgb(${r} ${g} ${b})`

const dimmed = (colour: Rgb, opacity: number): Rgb => [
  Math.round(colour[0] * (1 - opacity)),
  Math.round(colour[1] * (1 - opacity)),
  Math.round(colour[2] * (1 - opacity)),
]

/** Paints a frame as the device shows it: square pixels on a thin dark grid. */
export const paintPixelGrid = (
  ctx: Painter,
  frame: ImageData | null,
  { cell, gap, gridOpacity, size }: PixelGridMetrics,
): void => {
  ctx.fillStyle = GRID_COLOR
  ctx.fillRect(0, 0, size, size)

  const width = frame?.width ?? GRID_SIZE
  const height = frame?.height ?? GRID_SIZE
  const side = cell - gap
  const fadedGrid = gap > 0 && gridOpacity < 1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const colour: Rgb = frame
        ? [frame.data[i], frame.data[i + 1], frame.data[i + 2]]
        : UNLIT_PIXEL
      if (fadedGrid) {
        // The line is the pixel's own colour, darkened: no pass over the whole canvas.
        ctx.fillStyle = css(dimmed(colour, gridOpacity))
        ctx.fillRect(x * cell, y * cell, cell, cell)
      }
      ctx.fillStyle = css(colour)
      ctx.fillRect(x * cell, y * cell, side, side)
    }
  }
}
