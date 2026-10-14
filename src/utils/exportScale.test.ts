import { describe, expect, it } from 'vitest'
import { exportScaleFor, IOS_MAX_EXPORT_PIXELS, isIosDevice } from './exportScale'

const IPHONE = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', maxTouchPoints: 5 }
const IPAD_DESKTOP_UA = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 5 }
const MAC = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', maxTouchPoints: 0 }

describe('isIosDevice', () => {
  it('detects iPhone and iPad user agents', () => {
    expect(isIosDevice(IPHONE.userAgent, 0)).toBe(true)
    expect(isIosDevice('Mozilla/5.0 (iPad; CPU OS 17_0)', 0)).toBe(true)
  })

  it('detects iPadOS, which reports a Mac user agent with touch', () => {
    expect(isIosDevice(IPAD_DESKTOP_UA.userAgent, 5)).toBe(true)
    expect(isIosDevice(MAC.userAgent, 0)).toBe(false)
  })
})

describe('exportScaleFor', () => {
  it('keeps full resolution on desktop regardless of size', () => {
    expect(exportScaleFor(10_000, 10_000, MAC)).toBe(1)
  })

  it('keeps full resolution on iOS when the map fits the canvas limit', () => {
    expect(exportScaleFor(4000, 3000, IPHONE)).toBe(1)
  })

  it('scales an oversized iOS export so its area fits the limit', () => {
    const scale = exportScaleFor(5000, 7000, IPHONE)
    expect(scale).toBeLessThan(1)
    const scaledArea = 5000 * scale * 7000 * scale
    expect(scaledArea).toBeLessThanOrEqual(IOS_MAX_EXPORT_PIXELS + 1)
    expect(scaledArea).toBeGreaterThan(IOS_MAX_EXPORT_PIXELS * 0.999)
  })
})
