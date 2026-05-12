import { load, type Store } from '@tauri-apps/plugin-store'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Favorite {
  id: string
  dataUrl: string
  createdAt: number
  label?: string
  tags?: string[]
}

export const useFavoritesStore = defineStore('favorites', () => {
  const items = ref<Favorite[]>([])
  const loaded = ref(false)

  let store: Store | null = null

  const getStore = async (): Promise<Store> => {
    if (!store) {
      store = await load('favorites.json', { defaults: {} })
    }
    return store
  }

  const hydrate = async (): Promise<void> => {
    const store = await getStore()
    const saved = await store.get<Favorite[]>('favorites')
    if (saved) items.value = saved
    loaded.value = true
  }

  const persist = async (): Promise<void> => {
    const store = await getStore()
    await store.set('favorites', items.value)
    await store.save()
  }

  const add = async (dataUrl: string, label?: string): Promise<void> => {
    const favorite: Favorite = {
      id: crypto.randomUUID(),
      dataUrl,
      createdAt: Date.now(),
      label,
    }
    items.value.unshift(favorite)
    await persist()
  }

  const remove = async (id: string): Promise<void> => {
    items.value = items.value.filter((fav) => fav.id !== id)
    await persist()
  }

  const search = (query: string): Favorite[] => {
    const q = query.toLowerCase()
    return items.value.filter(
      (fav) =>
        fav.label?.toLowerCase().includes(q) ||
        fav.tags?.some((tag) => tag.toLowerCase().includes(q)),
    )
  }
  return { items, loaded, hydrate, add, remove, search }
})
