import type { CommandPayload, SendHttpGifPayload } from './types'

export const setBrightness = (value: number): CommandPayload => ({
  Command: 'Channel/SetBrightness',
  Brightness: Math.max(0, Math.min(100, value)),
})

export const powerOnOff = (on: boolean): CommandPayload => ({
  Command: 'Channel/OnOffScreen',
  OnOff: on ? 1 : 0,
})

export const setChannel = (index: number): CommandPayload => ({
  Command: 'Channel/SetIndex',
  SelectIndex: index,
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

export const setRotation = (angle: 0 | 90 | 180 | 270): CommandPayload => ({
  Command: 'Device/SetScreenRotationAngle',
  Mode: angle === 0 ? 0 : angle === 90 ? 1 : angle === 180 ? 2 : 3,
})

export const setMirror = (on: boolean): CommandPayload => ({
  Command: 'Device/SetMirrorMode',
  Mode: on ? 1 : 0,
})
