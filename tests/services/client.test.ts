import { describe, expect, it } from 'vitest'
import { MockDivoomClient } from '../../src/services/divoom/mock-client'

describe('MockDivoomClient', () => {
  it('creates instance with IP', () => {
    const client = new MockDivoomClient('192.168.1.100')
    expect(client).toBeDefined()
  })

  it('responds to GetAllConf', async () => {
    const client = new MockDivoomClient('192.168.1.100')
    const result = await client.send({ Command: 'Channel/GetAllConf' })
    expect(result.error_code).toBe(0)
    expect(result).toHaveProperty('Brightness')
    expect(result).toHaveProperty('LightSwitch')
  })

  it('responds to any command with success', async () => {
    const client = new MockDivoomClient('192.168.1.100')
    const result = await client.send({
      Command: 'Channel/SetBrightness',
      Brightness: 50,
    })
    expect(result.error_code).toBe(0)
  })
})
