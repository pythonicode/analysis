import { describe, expect, it } from 'vitest'
import {
  ANNOTATION_TEXT_SCALE_MAX,
  ANNOTATION_TEXT_SCALE_MIN,
  annotationTextScaleMultiplier,
  clampAnnotationTextScalePct,
} from './annotationTextScale'

describe('annotation text scale', () => {
  it('clamps percentages to the slider range', () => {
    expect(clampAnnotationTextScalePct(10)).toBe(ANNOTATION_TEXT_SCALE_MIN)
    expect(clampAnnotationTextScalePct(999)).toBe(ANNOTATION_TEXT_SCALE_MAX)
  })

  it('converts percentages to a multiplier', () => {
    expect(annotationTextScaleMultiplier(100)).toBe(1)
    expect(annotationTextScaleMultiplier(150)).toBe(1.5)
  })
})
