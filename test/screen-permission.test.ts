import { describe, expect, it } from 'vitest'
import { isScreenPermissionError } from '../src/renderer/src/coder/hooks/screen-permission'

describe('isScreenPermissionError', () => {
  it('detects the screenshot permission message', () => {
    expect(
      isScreenPermissionError(
        '截图失败，请检查屏幕录制权限（macOS：系统设置 › 隐私与安全性 › 屏幕录制）'
      )
    ).toBe(true)
  })

  it('detects the transcription audio-permission message', () => {
    expect(isScreenPermissionError('启动语音转录失败，请检查系统音频权限')).toBe(true)
  })

  it('detects an english screen recording message', () => {
    expect(isScreenPermissionError('Screen Recording permission is required')).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isScreenPermissionError('API 调用失败')).toBe(false)
    expect(isScreenPermissionError('')).toBe(false)
    expect(isScreenPermissionError(null)).toBe(false)
    expect(isScreenPermissionError(undefined)).toBe(false)
  })
})
