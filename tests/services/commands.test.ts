import { describe, expect, it } from 'vitest'
import {
  clearHttpText,
  getChannel,
  getDeviceSettings,
  powerOnOff,
  resetHttpGifId,
  sendHttpGif,
  setBrightness,
  setChannel,
  setMirror,
  setRotation,
  setTime24,
  setWhiteBalance,
} from '../../src/services/divoom/commands'

describe('commands', () => {
  it('setBrightness returns correct payload', () => {
    expect(setBrightness(50)).toEqual({
      Command: 'Channel/SetBrightness',
      Brightness: 50,
    })
  })

  it('setBrightness clamps value to 0-100', () => {
    expect(setBrightness(-10)).toEqual({
      Command: 'Channel/SetBrightness',
      Brightness: 0,
    })
    expect(setBrightness(200)).toEqual({
      Command: 'Channel/SetBrightness',
      Brightness: 100,
    })
  })

  it('powerOnOff returns correct payload', () => {
    expect(powerOnOff(true)).toEqual({
      Command: 'Channel/OnOffScreen',
      OnOff: 1,
    })
    expect(powerOnOff(false)).toEqual({
      Command: 'Channel/OnOffScreen',
      OnOff: 0,
    })
  })

  it('setChannel returns correct payload', () => {
    expect(setChannel(3)).toEqual({
      Command: 'Channel/SetIndex',
      SelectIndex: 3,
    })
  })

  it('getDeviceSettings returns correct payload', () => {
    expect(getDeviceSettings()).toEqual({
      Command: 'Channel/GetAllConf',
    })
  })

  it('resetHttpGifId returns correct payload', () => {
    expect(resetHttpGifId()).toEqual({
      Command: 'Draw/ResetHttpGifId',
    })
  })

  it('clearHttpText returns correct payload', () => {
    expect(clearHttpText()).toEqual({
      Command: 'Draw/ClearHttpText',
    })
  })

  it('sendHttpGif returns correct payload', () => {
    const result = sendHttpGif('base64data', 1, 0, 1, 100, 64)
    expect(result).toEqual({
      Command: 'Draw/SendHttpGif',
      PicNum: 1,
      PicWidth: 64,
      PicOffset: 0,
      PicID: 1,
      PicSpeed: 100,
      PicData: 'base64data',
    })
  })

  it('setRotation maps angle to mode correctly', () => {
    expect(setRotation(0)).toEqual({
      Command: 'Device/SetScreenRotationAngle',
      Mode: 0,
    })
    expect(setRotation(90)).toEqual({
      Command: 'Device/SetScreenRotationAngle',
      Mode: 1,
    })
    expect(setRotation(180)).toEqual({
      Command: 'Device/SetScreenRotationAngle',
      Mode: 2,
    })
    expect(setRotation(270)).toEqual({
      Command: 'Device/SetScreenRotationAngle',
      Mode: 3,
    })
  })

  it('setMirror returns correct payload', () => {
    expect(setMirror(true)).toEqual({
      Command: 'Device/SetMirrorMode',
      Mode: 1,
    })
    expect(setMirror(false)).toEqual({
      Command: 'Device/SetMirrorMode',
      Mode: 0,
    })
  })

  it('getChannel asks for the current channel', () => {
    expect(getChannel()).toEqual({ Command: 'Channel/GetIndex' })
  })

  it('setTime24 maps the clock format to the mode', () => {
    expect(setTime24(true)).toEqual({
      Command: 'Device/SetTime24Flag',
      Mode: 1,
    })
    expect(setTime24(false)).toEqual({
      Command: 'Device/SetTime24Flag',
      Mode: 0,
    })
  })

  it('setWhiteBalance sends the three channels', () => {
    expect(setWhiteBalance({ r: 100, g: 80, b: 60 })).toEqual({
      Command: 'Device/SetWhiteBalance',
      RValue: 100,
      GValue: 80,
      BValue: 60,
    })
  })

  it('setWhiteBalance clamps each channel to 0-100', () => {
    expect(setWhiteBalance({ r: 140, g: -5, b: 50 })).toMatchObject({
      RValue: 100,
      GValue: 0,
      BValue: 50,
    })
  })
})
