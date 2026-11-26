// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  deviceErrorMessage,
  isDeviceFailure,
} from '../../src/services/divoom/deviceError'
import { createTauriGateway } from '../../src/services/divoom/tauriGateway'

describe('tauri gateway', () => {
  it('sends a command through the device_send native command', async () => {
    const invoke = vi.fn().mockResolvedValue({ error_code: 0, Brightness: 80 })
    const gateway = createTauriGateway(invoke)

    const reply = await gateway.send('192.168.1.121', {
      Command: 'Channel/GetAllConf',
    })

    expect(invoke).toHaveBeenCalledWith('device_send', {
      ip: '192.168.1.121',
      payload: { Command: 'Channel/GetAllConf' },
    })
    expect(reply).toEqual({ error_code: 0, Brightness: 80 })
  })

  it('discovers devices through the device_discover native command', async () => {
    const device = {
      DeviceName: 'Pixoo64',
      DeviceId: 1,
      DevicePrivateIP: '192.168.1.121',
      DeviceMac: 'aa',
    }
    const invoke = vi.fn().mockResolvedValue([device])

    expect(await createTauriGateway(invoke).discover()).toEqual([device])
    expect(invoke).toHaveBeenCalledWith('device_discover')
  })

  it('lets the typed failure of the native command through', async () => {
    const invoke = vi.fn().mockRejectedValue({ kind: 'notPrivateIp' })

    await expect(
      createTauriGateway(invoke).send('8.8.8.8', { Command: 'x' }),
    ).rejects.toEqual({ kind: 'notPrivateIp' })
  })
})

describe('isDeviceFailure', () => {
  it('recognises the failures the native side reports', () => {
    expect(isDeviceFailure({ kind: 'unreachable', message: 'timeout' })).toBe(
      true,
    )
    expect(isDeviceFailure({ kind: 'commandRefused', errorCode: 3 })).toBe(true)
  })

  it.each([null, undefined, 42, {}, { kind: 42 }, { kind: 'loopback' }])(
    'rejects anything else: %s',
    (value) => {
      expect(isDeviceFailure(value)).toBe(false)
    },
  )
})

describe('deviceErrorMessage', () => {
  it.each([
    [{ kind: 'invalidIp' }, 'IPv4'],
    [{ kind: 'notPrivateIp' }, 'local network'],
    [{ kind: 'unreachable', message: 'tcp connect error' }, 'unreachable'],
    [{ kind: 'httpStatus', status: 500 }, '500'],
    [{ kind: 'invalidResponse' }, 'unexpected'],
    [{ kind: 'commandRefused', errorCode: 3 }, '3'],
  ])('describes %o for the user', (failure, expected) => {
    expect(deviceErrorMessage(failure)).toContain(expected)
  })

  it('keeps the low-level detail of an unreachable device out of the message', () => {
    expect(
      deviceErrorMessage({ kind: 'unreachable', message: 'tcp connect error' }),
    ).not.toContain('tcp')
  })

  it('falls back to the message of an ordinary error', () => {
    expect(deviceErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('has a message for anything else', () => {
    expect(deviceErrorMessage('??')).not.toBe('')
  })
})
