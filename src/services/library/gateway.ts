import { invoke as tauriInvoke } from '@tauri-apps/api/core'

/** An entry of the library index (ADR-0008); its frames are read on demand. */
export interface LibraryItem {
  id: string
  kind: 'still' | 'animation'
  label: string | null
  /** Milliseconds since the Unix epoch. */
  createdAt: number
  frameCount: number
  frameDurationMs: number
}

export interface NewLibraryItem {
  label?: string
  frameDurationMs: number
  /** 64 × 64 RGB, Base64, as sent to the device. */
  frames: string[]
}

/** What became of the favourites of the old single-file format. */
export interface Migration {
  migrated: number
  /** Favourites that could not be read; they stay in the old file. */
  failed: number
}

export interface Listing {
  items: LibraryItem[]
  /** Present on the launch that brought the old favourites in. */
  migration: Migration | null
}

/** Reads and writes the library on disk; replaced by a double in tests. */
export interface LibraryGateway {
  list(): Promise<Listing>
  add(item: NewLibraryItem): Promise<LibraryItem>
  firstFrame(id: string): Promise<string>
  frames(id: string): Promise<string[]>
  remove(id: string): Promise<void>
}

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

export const createTauriLibraryGateway = (
  invoke: Invoke = tauriInvoke,
): LibraryGateway => ({
  list: () => invoke<Listing>('library_list'),
  add: (item) => invoke<LibraryItem>('library_add', { ...item }),
  firstFrame: (id) => invoke<string>('library_first_frame', { id }),
  frames: (id) => invoke<string[]>('library_frames', { id }),
  remove: (id) => invoke<void>('library_remove', { id }),
})

let current: LibraryGateway = createTauriLibraryGateway()

export const getLibraryGateway = (): LibraryGateway => current

export const setLibraryGateway = (gateway: LibraryGateway): void => {
  current = gateway
}
