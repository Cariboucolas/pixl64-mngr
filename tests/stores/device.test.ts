// @vitest-environment jsdom
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { setDeviceGateway } from '../../src/services/divoom/gateway'
import { SendCancelled, still } from '../../src/services/divoom/sequence'
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
      { ip: IP, payload: { Command: 'Channel/GetIndex' } },
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

describe('device store display settings', () => {
  it('reads the channel and the display settings at connection', async () => {
    gateway.replyTo('Channel/GetAllConf', {
      error_code: 0,
      GyrateAngle: 3,
      MirrorFlag: 1,
      Time24Flag: 0,
    })
    gateway.replyTo('Channel/GetIndex', { SelectIndex: 2 })
    const store = useDeviceStore()

    await store.connect(IP)

    expect(store.channel).toBe(2)
    expect(store.rotation).toBe(270)
    expect(store.mirrored).toBe(true)
    expect(store.time24).toBe(false)
  })

  it('sends each display setting and keeps what the device accepted', async () => {
    const store = useDeviceStore()
    await store.connect(IP)

    await store.setRotation(90)
    await store.setMirror(true)
    await store.setTime24(false)
    await store.setWhiteBalance({ r: 100, g: 80, b: 60 })

    expect(gateway.sent.slice(-4).map((s) => s.payload)).toEqual([
      { Command: 'Device/SetScreenRotationAngle', Mode: 1 },
      { Command: 'Device/SetMirrorMode', Mode: 1 },
      { Command: 'Device/SetTime24Flag', Mode: 0 },
      {
        Command: 'Device/SetWhiteBalance',
        RValue: 100,
        GValue: 80,
        BValue: 60,
      },
    ])
    expect(store.rotation).toBe(90)
    expect(store.mirrored).toBe(true)
    expect(store.time24).toBe(false)
    expect(store.whiteBalance).toEqual({ r: 100, g: 80, b: 60 })
  })

  it('keeps the previous state when the device refuses a command', async () => {
    const refused = { kind: 'commandRefused', errorCode: 1 }
    const store = useDeviceStore()
    await store.connect(IP)
    for (const command of [
      'Device/SetScreenRotationAngle',
      'Device/SetMirrorMode',
      'Device/SetTime24Flag',
      'Device/SetWhiteBalance',
      'Channel/SetIndex',
    ]) {
      gateway.failOn(command, refused)
    }

    await expect(store.setRotation(180)).rejects.toEqual(refused)
    await expect(store.setMirror(true)).rejects.toEqual(refused)
    await expect(store.setTime24(false)).rejects.toEqual(refused)
    await expect(
      store.setWhiteBalance({ r: 10, g: 10, b: 10 }),
    ).rejects.toEqual(refused)
    await expect(store.setChannel(3)).rejects.toEqual(refused)

    expect(store.rotation).toBe(0)
    expect(store.mirrored).toBe(false)
    expect(store.time24).toBe(true)
    expect(store.whiteBalance).toEqual({ r: 100, g: 100, b: 100 })
    expect(store.channel).toBe(0)
  })
})

describe('device store connection loss', () => {
  const unreachable = { kind: 'unreachable', message: 'tcp connect error' }

  it('reports the connection as lost when the device stops answering', async () => {
    const store = useDeviceStore()
    await store.connect(IP)
    gateway.failWith(unreachable)

    await store.refresh()

    expect(store.lost).toBe(true)
    expect(store.connected).toBe(true)
    expect(store.ip).toBe(IP)
  })

  it('recovers and reads the settings again when the device answers', async () => {
    const store = useDeviceStore()
    await store.connect(IP)
    gateway.failWith(unreachable)
    await store.refresh()
    gateway.failWith(null)
    gateway.replyTo('Channel/GetAllConf', { error_code: 0, Brightness: 12 })
    gateway.replyTo('Channel/GetIndex', { SelectIndex: 1 })

    await store.refresh()

    expect(store.lost).toBe(false)
    expect(store.brightness).toBe(12)
    expect(store.channel).toBe(1)
  })

  it('checks nothing while no device is connected', async () => {
    const store = useDeviceStore()

    await store.refresh()

    expect(gateway.sent).toEqual([])
    expect(store.lost).toBe(false)
  })

  it('forgets the loss on disconnect', async () => {
    const store = useDeviceStore()
    await store.connect(IP)
    gateway.failWith(unreachable)
    await store.refresh()

    store.disconnect()

    expect(store.lost).toBe(false)
  })
})

const frame = (): ImageData =>
  ({
    data: new Uint8ClampedArray([255, 0, 0, 255]),
    width: 1,
    height: 1,
    colorSpace: 'srgb',
  }) as ImageData

describe('device store sending', () => {
  it('sends a sequence and remembers it as what the device shows', async () => {
    const store = useDeviceStore()
    await store.connect(IP)
    const sequence = still(frame())

    await store.send(sequence)

    expect(gateway.sent.slice(2).map((c) => c.payload.Command)).toEqual([
      'Draw/ResetHttpGifId',
      'Draw/ClearHttpText',
      'Channel/SetIndex',
      'Draw/SendHttpGif',
    ])
    expect(gateway.sent.at(-1)?.payload).toMatchObject({
      PicNum: 1,
      PicWidth: 1,
      PicData: '/wAA',
    })
    expect(store.shown).toStrictEqual(sequence)
    expect(store.channel).toBe(4)
  })

  it('keeps what was shown when the send fails', async () => {
    const store = useDeviceStore()
    await store.connect(IP)
    gateway.failWith({ kind: 'commandRefused', errorCode: 3 })

    await expect(store.send(still(frame()))).rejects.toEqual({
      kind: 'commandRefused',
      errorCode: 3,
    })

    expect(store.shown).toBeNull()
  })

  it('lets a new send go through after a cancelled one', async () => {
    const store = useDeviceStore()
    await store.connect(IP)
    const controller = new AbortController()
    controller.abort()
    const sequence = still(frame())

    await expect(
      store.send(sequence, { signal: controller.signal }),
    ).rejects.toBeInstanceOf(SendCancelled)
    await store.send(sequence)

    expect(store.shown).toStrictEqual(sequence)
  })

  it('refuses to send while no device is connected', async () => {
    const store = useDeviceStore()

    await expect(store.send(still(frame()))).rejects.toThrow()

    expect(gateway.sent).toEqual([])
  })

  it('forgets what was shown on disconnect', async () => {
    const store = useDeviceStore()
    await store.connect(IP)
    await store.send(still(frame()))

    store.disconnect()

    expect(store.shown).toBeNull()
  })
})

describe('device store direct play', () => {
  it('tells the device to play a URL and forgets the preview it cannot show', async () => {
    const store = useDeviceStore()
    await store.connect(IP)
    await store.send(still(frame()))

    await store.playUrl('http://f.divoom-gz.com/64_64.gif')

    expect(gateway.sent.at(-1)?.payload).toEqual({
      Command: 'Device/PlayTFGif',
      FileType: 2,
      FileName: 'http://f.divoom-gz.com/64_64.gif',
    })
    expect(store.shown).toBeNull()
  })

  it('keeps the preview when the device refuses to play the URL', async () => {
    const store = useDeviceStore()
    await store.connect(IP)
    const sequence = still(frame())
    await store.send(sequence)
    gateway.failOn('Device/PlayTFGif', { kind: 'commandRefused', errorCode: 1 })

    await expect(store.playUrl('http://example.com/a.gif')).rejects.toEqual({
      kind: 'commandRefused',
      errorCode: 1,
    })

    expect(store.shown).toStrictEqual(sequence)
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
