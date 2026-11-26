import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type LibraryItem, useLibraryStore } from '../../src/stores/library'

const saved = new Map<string, unknown>()
const openedFiles: string[] = []

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn(async (file: string) => {
    openedFiles.push(file)
    return {
      get: async (key: string) => saved.get(key),
      set: async (key: string, value: unknown) => {
        saved.set(key, JSON.parse(JSON.stringify(value)))
      },
      save: async () => {},
    }
  }),
}))

const item = (overrides: Partial<LibraryItem>): LibraryItem => ({
  id: 'a',
  dataUrl: 'data:image/png;base64,AAAA',
  createdAt: 1,
  ...overrides,
})

describe('library store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    saved.clear()
    openedFiles.length = 0
  })

  it('finds the items saved when the library was still called favorites', async () => {
    saved.set('favorites', [item({ id: 'old', label: 'Halo' })])
    const store = useLibraryStore()

    await store.hydrate()

    expect(openedFiles).toEqual(['favorites.json'])
    expect(store.items.map((i) => i.id)).toEqual(['old'])
    expect(store.loaded).toBe(true)
  })

  it('starts empty when nothing was saved', async () => {
    const store = useLibraryStore()

    await store.hydrate()

    expect(store.items).toEqual([])
    expect(store.loaded).toBe(true)
  })

  it('puts a new item first and saves it', async () => {
    saved.set('favorites', [item({ id: 'old' })])
    const store = useLibraryStore()
    await store.hydrate()

    await store.add('data:image/png;base64,BBBB', 'Logo')

    expect(store.items[0]).toMatchObject({
      dataUrl: 'data:image/png;base64,BBBB',
      label: 'Logo',
    })
    expect(store.items).toHaveLength(2)
    expect(saved.get('favorites')).toEqual(store.items)
  })

  it('removes an item and saves the rest', async () => {
    saved.set('favorites', [item({ id: 'a' }), item({ id: 'b' })])
    const store = useLibraryStore()
    await store.hydrate()

    await store.remove('a')

    expect(store.items.map((i) => i.id)).toEqual(['b'])
    expect(saved.get('favorites')).toEqual(store.items)
  })

  it('searches labels and tags without minding the case', async () => {
    saved.set('favorites', [
      item({ id: 'a', label: 'Logo Halo' }),
      item({ id: 'b', tags: ['Retro'] }),
      item({ id: 'c' }),
    ])
    const store = useLibraryStore()
    await store.hydrate()

    expect(store.search('halo').map((i) => i.id)).toEqual(['a'])
    expect(store.search('RETRO').map((i) => i.id)).toEqual(['b'])
    expect(store.search('nothing')).toEqual([])
  })
})
