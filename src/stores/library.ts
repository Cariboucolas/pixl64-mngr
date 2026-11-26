import { load, type Store } from '@tauri-apps/plugin-store'
import { defineStore } from 'pinia'
import { ref } from 'vue'

/** Kept from before the library was renamed, so saved items are still found. */
const STORAGE_FILE = 'favorites.json'
const STORAGE_KEY = 'favorites'

export interface LibraryItem {
  id: string
  dataUrl: string
  createdAt: number
  label?: string
  tags?: string[]
}

export const useLibraryStore = defineStore('library', () => {
  const items = ref<LibraryItem[]>([])
  const loaded = ref(false)

  let store: Store | null = null

  const getStore = async (): Promise<Store> => {
    if (!store) {
      store = await load(STORAGE_FILE, { defaults: {} })
    }
    return store
  }

  const hydrate = async (): Promise<void> => {
    const store = await getStore()
    const saved = await store.get<LibraryItem[]>(STORAGE_KEY)
    if (saved) items.value = saved
    loaded.value = true
  }

  const persist = async (): Promise<void> => {
    const store = await getStore()
    await store.set(STORAGE_KEY, items.value)
    await store.save()
  }

  const add = async (dataUrl: string, label?: string): Promise<void> => {
    const item: LibraryItem = {
      id: crypto.randomUUID(),
      dataUrl,
      createdAt: Date.now(),
      label,
    }
    items.value.unshift(item)
    await persist()
  }

  const remove = async (id: string): Promise<void> => {
    items.value = items.value.filter((item) => item.id !== id)
    await persist()
  }

  const search = (query: string): LibraryItem[] => {
    const q = query.toLowerCase()
    return items.value.filter(
      (item) =>
        item.label?.toLowerCase().includes(q) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(q)),
    )
  }
  return { items, loaded, hydrate, add, remove, search }
})
