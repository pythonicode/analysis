export const ANNOTATION_TEXT_SCALE_MIN = 50
export const ANNOTATION_TEXT_SCALE_MAX = 200
export const ANNOTATION_TEXT_SCALE_STEP = 5
export const ANNOTATION_TEXT_SCALE_DEFAULT = 100

export function clampAnnotationTextScalePct(percent: number): number {
  if (!Number.isFinite(percent)) return ANNOTATION_TEXT_SCALE_DEFAULT
  return Math.min(
    ANNOTATION_TEXT_SCALE_MAX,
    Math.max(ANNOTATION_TEXT_SCALE_MIN, percent),
  )
}

/** 100% → 1. Shared by the status bar, export panel, map comments, and sidebar. */
export function annotationTextScaleMultiplier(percent: number): number {
  return clampAnnotationTextScalePct(percent) / 100
}
