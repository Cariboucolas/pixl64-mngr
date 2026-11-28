import { invoke as tauriInvoke } from '@tauri-apps/api/core'

/** What the native side tells about a source it opened (ADR-0007). */
export interface OpenedSource {
  width: number
  height: number
  frameCount: number
  /** PNG, Base64. */
  firstFrame: string
}

/**
 * Where the source sits on the 64 × 64 screen: its top-left corner and its
 * scale, in screen pixels.
 */
export interface Crop {
  offsetX: number
  offsetY: number
  scale: number
}

export interface RenderedAnimation {
  /** 64 × 64 RGB, Base64. */
  frames: string[]
  frameDurationMs: number
  /** How many frames the source had before reduction. */
  sourceFrameCount: number
}

/** Opens sources and renders them as device frames; replaced by a double in tests. */
export interface SourceGateway {
  openFile(bytes: Uint8Array): Promise<OpenedSource>
  openUrl(url: string): Promise<OpenedSource>
  /** Renders the source opened last. */
  render(crop: Crop): Promise<RenderedAnimation>
  /** Resolves when the URL points to a GIF the device can download and play (ADR-0009). */
  checkDirectPlay(url: string): Promise<void>
}

type Invoke = <T>(
  command: string,
  args?: Record<string, unknown> | Uint8Array,
) => Promise<T>

export const createTauriSourceGateway = (
  invoke: Invoke = tauriInvoke,
): SourceGateway => ({
  // The bytes travel as the raw body of the request, not as a JSON array.
  openFile: (bytes) => invoke<OpenedSource>('source_open_file', bytes),
  openUrl: (url) => invoke<OpenedSource>('source_open_url', { url }),
  render: (crop) => invoke<RenderedAnimation>('source_render', { crop }),
  checkDirectPlay: (url) => invoke<void>('direct_play_check', { url }),
})

let current: SourceGateway = createTauriSourceGateway()

export const getSourceGateway = (): SourceGateway => current

export const setSourceGateway = (gateway: SourceGateway): void => {
  current = gateway
}
