import { load, type Store } from '@tauri-apps/plugin-store'

let store: Store | null = null

async function getStore(): Promise<Store> {
  if (!store) {
    store = await load('settings.json', { defaults: {} })
  }
  return store
}

export async function get<T>(key: string): Promise<T | undefined> {
  const s = await getStore()
  return (await s.get<T>(key)) ?? undefined
}

export async function set<T>(key: string, value: T): Promise<void> {
  const s = await getStore()
  await s.set(key, value)
  await s.save()
}

export async function getAll(): Promise<Record<string, unknown>> {
  const s = await getStore()
  const entries = await s.entries<unknown>()
  return Object.fromEntries(entries)
}
