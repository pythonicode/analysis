import { describe, expect, it } from 'vitest'
import { pinchViewport } from './viewport'
import type { Viewport } from '../types'

/** Where a stage point lands on screen under a viewport. */
const toScreen = (vp: Viewport, p: { x: number; y: number }) => ({
  x: vp.x + p.x * vp.scale,
  y: vp.y + p.y * vp.scale,
})

describe('pinchViewport', () => {
  it('keeps the point under the fingers while zooming in', () => {
    const vp: Viewport = { scale: 0.5, x: 20, y: -10, rotation: 0 }
    const centre = { x: 200, y: 300 }
    const anchor = { x: (centre.x - vp.x) / vp.scale, y: (centre.y - vp.y) / vp.scale }

    const next = pinchViewport(vp, centre, centre, 1.5, 0.05, 8)

    expect(next.scale).toBeCloseTo(0.75)
    const landed = toScreen(next, anchor)
    expect(landed.x).toBeCloseTo(centre.x)
    expect(landed.y).toBeCloseTo(centre.y)
  })

  it('moves the content with the fingers when they pan during a pinch', () => {
    const vp: Viewport = { scale: 1, x: 0, y: 0, rotation: 0 }
    const before = { x: 100, y: 100 }
    const anchor = { x: before.x / vp.scale, y: before.y / vp.scale }
    const after = { x: 130, y: 90 }

    const next = pinchViewport(vp, before, after, 1, 0.05, 8)

    const landed = toScreen(next, anchor)
    expect(landed.x).toBeCloseTo(after.x)
    expect(landed.y).toBeCloseTo(after.y)
  })

  it('clamps the scale to the allowed range', () => {
    const vp: Viewport = { scale: 7, x: 0, y: 0, rotation: 0 }
    expect(pinchViewport(vp, { x: 0, y: 0 }, { x: 0, y: 0 }, 2, 0.05, 8).scale).toBe(8)
    expect(
      pinchViewport({ ...vp, scale: 0.06 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 0.5, 0.05, 8).scale,
    ).toBe(0.05)
  })

  it('leaves rotation unchanged', () => {
    const vp: Viewport = { scale: 1, x: 0, y: 0, rotation: 37 }
    expect(pinchViewport(vp, { x: 0, y: 0 }, { x: 5, y: 5 }, 1.2, 0.05, 8).rotation).toBe(37)
  })
})
