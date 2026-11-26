// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { setDeviceGateway } from '../../src/services/divoom/gateway'
import type { DivoomDevice } from '../../src/services/divoom/types'
import { useDeviceStore } from '../../src/stores/device'
import { createFakeGateway, type FakeGateway } from '../doubles/fakeGateway'

const IP = '192.168.1.121'
let gateway: FakeGateway

beforeEach(() => {
  setActivePinia(createPinia())
  gateway = createFakeGateway()
  setDeviceGateway(gateway)
})

describe('device store connection', () => {
  it('reads the settings of the device it connects to', async () => {
    gateway.replyTo('Channel/GetAllConf', {
      error_code: 0,
      Brightness: 42,
      LightSwitch: 0,
    })
    const store = useDeviceStore()

    await store.connect(IP)

    expect(gateway.sent).toEqual([
      { ip: IP, payload: { Command: 'Channel/GetAllConf' } },
    ])
    expect(store.connected).toBe(true)
    expect(store.ip).toBe(IP)
    expect(store.brightness).toBe(42)
    expect(store.screenOn).toBe(false)
  })

  it('stays disconnected and explains why when the device cannot be reached', async () => {
    gateway.failWith({ kind: 'unreachable', message: 'tcp connect error' })
    const store = useDeviceStore()

    await expect(store.connect(IP)).rejects.toEqual({
      kind: 'unreachable',
      message: 'tcp connect error',
    })

    expect(store.connected).toBe(false)
    expect(store.isReady).toBe(false)
    expect(store.getLink()).toBeNull()
    expect(store.error).toContain('unreachable')
  })

  it('sends a setting to the connected device', async () => {
    const store = useDeviceStore()
    await store.connect(IP)

    await store.setBrightness(30)

    expect(gateway.sent.at(-1)).toEqual({
      ip: IP,
      payload: { Command: 'Channel/SetBrightness', Brightness: 30 },
    })
    expect(store.brightness).toBe(30)
  })

  it('sends nothing while no device is connected', async () => {
    const store = useDeviceStore()

    await store.setBrightness(30)

    expect(gateway.sent).toEqual([])
  })

  it('gives a link that sends to the connected device', async () => {
    const store = useDeviceStore()
    await store.connect(IP)

    await store.getLink()?.send({ Command: 'Draw/ResetHttpGifId' })

    expect(gateway.sent.at(-1)).toEqual({
      ip: IP,
      payload: { Command: 'Draw/ResetHttpGifId' },
    })
  })

  it('forgets the device on disconnect', async () => {
    const store = useDeviceStore()
    await store.connect(IP)

    store.disconnect()

    expect(store.getLink()).toBeNull()
    expect(store.connected).toBe(false)
  })
})

describe('device store discovery', () => {
  it('has not discovered before any search', () => {
    const store = useDeviceStore()
    expect(store.hasDiscovered).toBe(false)
  })

  it('marks a search that found no device as discovered', async () => {
    const store = useDeviceStore()

    await store.discover()

    expect(store.hasDiscovered).toBe(true)
    expect(store.discoveredDevices).toEqual([])
  })

  it('does not mark a failed search as discovered', async () => {
    gateway.failWith(new Error('Discovery failed'))
    const store = useDeviceStore()

    await store.discover()

    expect(store.hasDiscovered).toBe(false)
    expect(store.error).toBe('Discovery failed')
  })

  it('lists the devices a search found', async () => {
    const device: DivoomDevice = {
      DeviceName: 'Pixoo64',
      DeviceId: 1,
      DevicePrivateIP: IP,
      DeviceMac: 'aa',
    }
    gateway.discovers([device])
    const store = useDeviceStore()

    await store.discover()

    expect(store.discoveredDevices).toEqual([device])
  })

  it('resets the discovered state while a new search runs', async () => {
    const store = useDeviceStore()
    await store.discover()

    let resolveSearch: (devices: DivoomDevice[]) => void = () => {}
    gateway.discover = () =>
      new Promise((resolve) => {
        resolveSearch = resolve
      })
    const search = store.discover()

    expect(store.hasDiscovered).toBe(false)

    resolveSearch([])
    await search
    expect(store.hasDiscovered).toBe(true)
  })
})
