import type { CommandPayload, DeviceResponse } from './types'

export class MockDivoomClient {
  async send<T extends DeviceResponse>(payload: CommandPayload): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, 50))

    const base: DeviceResponse = { error_code: 0 }

    if (payload.Command === 'Channel/GetAllConf') {
      return {
        ...base,
        Brightness: 80,
        RotationFlag: 0,
        ClockTime: 60,
        GalleryTime: 60,
        SingleGalleyTime: 5,
        PowerOnChannelId: 0,
        GalleryShowTimeFlag: 1,
        CurClockId: 1,
        Time24Flag: 1,
        TemperatureMode: 0,
        GyrateAngle: 0,
        MirrorFlag: 0,
        LightSwitch: 1,
      } as unknown as T
    }

    return base as T
  }
}
