export interface DivoomDevice {
  DeviceName: string
  DeviceId: number
  DevicePrivateIP: string
  DeviceMac: string
}

export interface CommandPayload {
  Command: string
  [key: string]: unknown
}

export interface DeviceResponse {
  error_code: number
  [key: string]: unknown
}

export interface DeviceSettings {
  Brightness: number
  RotationFlag: number
  ClockTime: number
  GalleryTime: number
  SingleGalleyTime: number
  PowerOnChannelId: number
  GalleryShowTimeFlag: number
  CurClockId: number
  Time24Flag: number
  TemperatureMode: number
  GyrateAngle: number
  MirrorFlag: number
  LightSwitch: number
}

export interface DiscoveryResponse {
  ReturnCode: number
  ReturnMessage: string
  DeviceList: DivoomDevice[]
}

export interface SendHttpGifPayload extends CommandPayload {
  Command: 'Draw/SendHttpGif'
  PicNum: number
  PicWidth: number
  PicOffset: number
  PicID: number
  PicSpeed: number
  PicData: string
}

export class DeviceHttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'DeviceHttpError'
  }
}

export class DeviceCommandError extends Error {
  constructor(
    message: string,
    public readonly errorCode: number,
  ) {
    super(message)
    this.name = 'DeviceCommandError'
  }
}
