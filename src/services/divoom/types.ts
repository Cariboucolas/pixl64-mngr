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

/** Screen rotation in degrees; the position in this list is the device's `Mode` and `GyrateAngle`. */
export const ROTATION_ANGLES = [0, 90, 180, 270] as const
export type RotationAngle = (typeof ROTATION_ANGLES)[number]

/** Share of each colour, 0 to 100. The device cannot be asked for its current value. */
export interface WhiteBalance {
  r: number
  g: number
  b: number
}
