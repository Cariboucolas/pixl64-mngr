import { defineStore } from 'pinia'
import { ref } from 'vue'
import { encodeFrame } from '../services/divoom/image'
import {
  decodeFrame,
  type Frame,
  type Sequence,
  STILL_DURATION_MS,
} from '../services/divoom/sequence'
import {
  getLibraryGateway,
  type LibraryItem,
  type Migration,
} from '../services/library/gateway'

export type { LibraryItem }

export const useLibraryStore = defineStore('library', () => {
  const items = ref<LibraryItem[]>([])
  const loaded = ref(false)
  /** Set on the launch that brought the old favourites in. */
  const migration = ref<Migration | null>(null)

  const hydrate = async (): Promise<void> => {
    const listing = await getLibraryGateway().list()
    items.value = listing.items
    if (listing.migration) migration.value = listing.migration
    loaded.value = true
  }

  const add = async (sequence: Sequence, label?: string): Promise<void> => {
    const saved = await getLibraryGateway().add({
      label: label?.trim() || undefined,
      frameDurationMs: sequence.frameDurationMs,
      frames: sequence.frames.map(encodeFrame),
    })
    items.value = [saved, ...items.value]
  }

  const remove = async (id: string): Promise<void> => {
    await getLibraryGateway().remove(id)
    items.value = items.value.filter((item) => item.id !== id)
  }

  /** Every frame of an item, with its pace: what is sent to the device. */
  const sequenceOf = async (id: string): Promise<Sequence> => {
    const frames = await getLibraryGateway().frames(id)
    const item = items.value.find((candidate) => candidate.id === id)
    return {
      frames: frames.map(decodeFrame),
      frameDurationMs: item?.frameDurationMs ?? STILL_DURATION_MS,
    }
  }

  const thumbnailOf = async (id: string): Promise<Frame> =>
    decodeFrame(await getLibraryGateway().firstFrame(id))

  const search = (query: string): LibraryItem[] => {
    const q = query.toLowerCase()
    return items.value.filter((item) => item.label?.toLowerCase().includes(q))
  }

  return {
    items,
    loaded,
    migration,
    hydrate,
    add,
    remove,
    sequenceOf,
    thumbnailOf,
    search,
  }
})
