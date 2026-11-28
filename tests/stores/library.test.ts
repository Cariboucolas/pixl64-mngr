// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Frame } from '../../src/services/divoom/sequence'
import {
  type LibraryGateway,
  type LibraryItem,
  type NewLibraryItem,
  setLibraryGateway,
} from '../../src/services/library/gateway'
import { useLibraryStore } from '../../src/stores/library'

const RED = btoa('ÿ\u0000\u0000')
const BLUE = btoa('\u0000\u0000ÿ')

const red: Frame = {
  data: new Uint8ClampedArray([255, 0, 0, 255]),
  width: 1,
  height: 1,
}
const blue: Frame = {
  data: new Uint8ClampedArray([0, 0, 255, 255]),
  width: 1,
  height: 1,
}

const item = (id: string, label?: string, frameCount = 1): LibraryItem => ({
  id,
  kind: frameCount > 1 ? 'animation' : 'still',
  label: label ?? null,
  createdAt: 1_000,
  frameCount,
  frameDurationMs: 100,
})

/** Stands in for the library on disk. */
const fakeLibrary = (initial: LibraryItem[] = []) => {
  const items = [...initial]
  const added: NewLibraryItem[] = []
  const frames = new Map<string, string[]>()
  let migration: { migrated: number; failed: number } | null = null
  const gateway: LibraryGateway = {
    list: async () => ({ items: [...items], migration }),
    add: async (newItem) => {
      added.push(newItem)
      const saved = item(
        `new-${added.length}`,
        newItem.label,
        newItem.frames.length,
      )
      frames.set(saved.id, newItem.frames)
      items.unshift(saved)
      return saved
    },
    firstFrame: async (id) => (frames.get(id) ?? [RED])[0],
    frames: async (id) => frames.get(id) ?? [RED],
    remove: async (id) => {
      items.splice(
        items.findIndex((candidate) => candidate.id === id),
        1,
      )
    },
  }
  return {
    gateway,
    added,
    frames,
    migrated: (report: { migrated: number; failed: number }) => {
      migration = report
    },
  }
}

const storeOver = (library: ReturnType<typeof fakeLibrary>) => {
  setLibraryGateway(library.gateway)
  return useLibraryStore()
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('library store', () => {
  it('lists what the library holds', async () => {
    const store = storeOver(fakeLibrary([item('a', 'Logo'), item('b')]))

    await store.hydrate()

    expect(store.loaded).toBe(true)
    expect(store.items.map((saved) => saved.id)).toEqual(['a', 'b'])
  })

  it('tells when old favourites were brought in', async () => {
    const library = fakeLibrary([item('a')])
    library.migrated({ migrated: 1, failed: 2 })
    const store = storeOver(library)

    await store.hydrate()

    expect(store.migration).toEqual({ migrated: 1, failed: 2 })
  })

  it('saves a sequence as device frames and puts it first', async () => {
    const library = fakeLibrary([item('a')])
    const store = storeOver(library)
    await store.hydrate()

    await store.add({ frames: [red, blue], frameDurationMs: 80 }, ' Flag ')

    expect(library.added).toEqual([
      { label: 'Flag', frameDurationMs: 80, frames: [RED, BLUE] },
    ])
    expect(store.items[0]).toMatchObject({ kind: 'animation', frameCount: 2 })
    expect(store.items).toHaveLength(2)
  })

  it('saves without a label when none is given', async () => {
    const library = fakeLibrary()
    const store = storeOver(library)

    await store.add({ frames: [red], frameDurationMs: 100 }, '  ')

    expect(library.added[0].label).toBeUndefined()
  })

  it('gives back a saved sequence, ready to send', async () => {
    const library = fakeLibrary([item('a', 'Flag', 2)])
    library.frames.set('a', [RED, BLUE])
    const store = storeOver(library)
    await store.hydrate()

    const sequence = await store.sequenceOf('a')

    expect(sequence.frameDurationMs).toBe(100)
    expect(sequence.frames.map((frame) => Array.from(frame.data))).toEqual([
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    ])
  })

  it('gives the first frame of an item for its thumbnail', async () => {
    const library = fakeLibrary([item('a', 'Flag', 2)])
    library.frames.set('a', [BLUE, RED])
    const store = storeOver(library)

    const thumbnail = await store.thumbnailOf('a')

    expect(Array.from(thumbnail.data)).toEqual([0, 0, 255, 255])
  })

  it('removes an item', async () => {
    const store = storeOver(fakeLibrary([item('a'), item('b')]))
    await store.hydrate()

    await store.remove('a')

    expect(store.items.map((saved) => saved.id)).toEqual(['b'])
  })

  it('searches labels without minding the case', async () => {
    const store = storeOver(
      fakeLibrary([item('a', 'Halo Logo'), item('b', 'Sunset'), item('c')]),
    )
    await store.hydrate()

    expect(store.search('LOGO').map((saved) => saved.id)).toEqual(['a'])
    expect(store.search('zzz')).toEqual([])
  })
})
