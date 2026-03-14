import type { CommandPayload, SendHttpGifPayload } from './types'

export function setBrightness(value: number): CommandPayload {
  return {
    Command: 'Channel/SetBrightness',
    Brightness: Math.max(0, Math.min(100, value)),
  }
}

export function powerOnOff(on: boolean): CommandPayload {
  return { Command: 'Channel/OnOffScreen', OnOff: on ? 1 : 0 }
}

export function setChannel(index: number): CommandPayload {
  return { Command: 'Channel/SetIndex', SelectIndex: index }
}

export function getDeviceSettings(): CommandPayload {
  return { Command: 'Channel/GetAllConf' }
}

export function resetHttpGifId(): CommandPayload {
  return { Command: 'Draw/ResetHttpGifId' }
}

export function clearHttpText(): CommandPayload {
  return { Command: 'Draw/ClearHttpText' }
}

export function sendHttpGif(
  picData: string,
  picId: number,
  picOffset: number,
  picNum: number,
  speed: number = 100,
  width: number = 64,
): SendHttpGifPayload {
  return {
    Command: 'Draw/SendHttpGif',
    PicNum: picNum,
    PicWidth: width,
    PicOffset: picOffset,
    PicID: picId,
    PicSpeed: speed,
    PicData: picData,
  }
}

export function setRotation(angle: 0 | 90 | 180 | 270): CommandPayload {
  return {
    Command: 'Device/SetScreenRotationAngle',
    Mode: angle === 0 ? 0 : angle === 90 ? 1 : angle === 180 ? 2 : 3,
  }
}

export function setMirror(on: boolean): CommandPayload {
  return { Command: 'Device/SetMirrorMode', Mode: on ? 1 : 0 }
}
