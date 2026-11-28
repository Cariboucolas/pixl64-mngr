import type {
  CommandPayload,
  RotationAngle,
  SendHttpGifPayload,
  WhiteBalance,
} from './types'
import { ROTATION_ANGLES } from './types'

const percent = (value: number): number => Math.max(0, Math.min(100, value))

export const setBrightness = (value: number): CommandPayload => ({
  Command: 'Channel/SetBrightness',
  Brightness: percent(value),
})

export const powerOnOff = (on: boolean): CommandPayload => ({
  Command: 'Channel/OnOffScreen',
  OnOff: on ? 1 : 0,
})

export const setChannel = (index: number): CommandPayload => ({
  Command: 'Channel/SetIndex',
  SelectIndex: index,
})

export const getChannel = (): CommandPayload => ({
  Command: 'Channel/GetIndex',
})

export const getDeviceSettings = (): CommandPayload => ({
  Command: 'Channel/GetAllConf',
})

export const resetHttpGifId = (): CommandPayload => ({
  Command: 'Draw/ResetHttpGifId',
})

export const clearHttpText = (): CommandPayload => ({
  Command: 'Draw/ClearHttpText',
})

export const sendHttpGif = (
  picData: string,
  picId: number,
  picOffset: number,
  picNum: number,
  speed: number = 100,
  width: number = 64,
): SendHttpGifPayload => ({
  Command: 'Draw/SendHttpGif',
  PicNum: picNum,
  PicWidth: width,
  PicOffset: picOffset,
  PicID: picId,
  PicSpeed: speed,
  PicData: picData,
})

export const setRotation = (angle: RotationAngle): CommandPayload => ({
  Command: 'Device/SetScreenRotationAngle',
  Mode: ROTATION_ANGLES.indexOf(angle),
})

export const setMirror = (on: boolean): CommandPayload => ({
  Command: 'Device/SetMirrorMode',
  Mode: on ? 1 : 0,
})

/** `FileType` of `Device/PlayTFGif` for a file the device downloads from a URL. */
const GIF_FROM_URL = 2

export const playGifUrl = (url: string): CommandPayload => ({
  Command: 'Device/PlayTFGif',
  FileType: GIF_FROM_URL,
  FileName: url,
})

export const setTime24 = (on: boolean): CommandPayload => ({
  Command: 'Device/SetTime24Flag',
  Mode: on ? 1 : 0,
})

export const setWhiteBalance = ({ r, g, b }: WhiteBalance): CommandPayload => ({
  Command: 'Device/SetWhiteBalance',
  RValue: percent(r),
  GValue: percent(g),
  BValue: percent(b),
})
