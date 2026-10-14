import { describe, expect, it } from 'vitest'
import { clampRotation, clampViewport, MAX_SCALE, MIN_SCALE, normalizeRotation } from './viewport'

describe('normalizeRotation', () => {
  it('wraps into [0, 360)', () => {
    expect(normalizeRotation(370)).toBe(10)
    expect(normalizeRotation(-90)).toBe(270)
  })

  it('treats non-finite input as zero', () => {
    expect(normalizeRotation(Number.NaN)).toBe(0)
  })
})

describe('clampRotation', () => {
  it('limits the signed slider value to ±360', () => {
    expect(clampRotation(500)).toBe(360)
    expect(clampRotation(-500)).toBe(-360)
    expect(clampRotation(12.6)).toBe(13)
  })
})

describe('clampViewport', () => {
  it('clamps scale to the supported range', () => {
    expect(clampViewport({ scale: 100, x: 0, y: 0, rotation: 0 }).scale).toBe(MAX_SCALE)
    expect(clampViewport({ scale: 0, x: 0, y: 0, rotation: 0 }).scale).toBe(MIN_SCALE)
  })

  it('replaces non-finite values with defaults', () => {
    expect(
      clampViewport({ scale: Number.NaN, x: Number.POSITIVE_INFINITY, y: 4, rotation: 0 }),
    ).toEqual({ scale: 1, x: 0, y: 4, rotation: 0 })
  })
})
