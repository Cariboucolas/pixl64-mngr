import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { discoverDevices } from '../../src/services/divoom/discovery'
import type { DivoomDevice } from '../../src/services/divoom/types'
import { useDeviceStore } from '../../src/stores/device'

vi.mock('../../src/services/divoom/discovery', () => ({
  discoverDevices: vi.fn(),
  validateDevice: vi.fn(),
}))

const mockedDiscoverDevices = vi.mocked(discoverDevices)

describe('device store discovery', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedDiscoverDevices.mockReset()
  })

  it('has not discovered before any search', () => {
    const store = useDeviceStore()
    expect(store.hasDiscovered).toBe(false)
  })

  it('marks a search that found no device as discovered', async () => {
    mockedDiscoverDevices.mockResolvedValue([])
    const store = useDeviceStore()

    await store.discover()

    expect(store.hasDiscovered).toBe(true)
    expect(store.discoveredDevices).toEqual([])
  })

  it('does not mark a failed search as discovered', async () => {
    mockedDiscoverDevices.mockRejectedValue(new Error('Discovery failed'))
    const store = useDeviceStore()

    await store.discover()

    expect(store.hasDiscovered).toBe(false)
    expect(store.error).toBe('Discovery failed')
  })

  it('resets the discovered state while a new search runs', async () => {
    mockedDiscoverDevices.mockResolvedValueOnce([])
    const store = useDeviceStore()
    await store.discover()

    let resolveSearch: (devices: DivoomDevice[]) => void = () => {}
    mockedDiscoverDevices.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSearch = resolve
      }),
    )
    const search = store.discover()

    expect(store.hasDiscovered).toBe(false)

    resolveSearch([])
    await search
    expect(store.hasDiscovered).toBe(true)
  })
})
