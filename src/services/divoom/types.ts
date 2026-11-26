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

/** A device reply. Some commands (`Channel/GetIndex`) answer without `error_code`. */
export interface DeviceReply {
  error_code?: number
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

export interface SendHttpGifPayload extends CommandPayload {
  Command: 'Draw/SendHttpGif'
  PicNum: number
  PicWidth: number
  PicOffset: number
  PicID: number
  PicSpeed: number
  PicData: string
}
