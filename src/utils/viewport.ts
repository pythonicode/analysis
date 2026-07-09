import type { Viewport } from '../types'

export const MIN_SCALE = 0.05
export const MAX_SCALE = 8

/** Minimum screen-pixel size before Konva shadow caching can round to 0×0. */
export const MIN_SHADOW_SCREEN_PX = 3

export function clampViewport(viewport: Viewport): Viewport {
  const scale = Number.isFinite(viewport.scale)
    ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale))
    : 1
  return {
    scale,
    x: Number.isFinite(viewport.x) ? viewport.x : 0,
    y: Number.isFinite(viewport.y) ? viewport.y : 0,
  }
}

export const DEFAULT_VIEWPORT: Viewport = { scale: 1, x: 0, y: 0 }

/** True when a map-local dimension is large enough to safely use Konva shadows. */
export function canUseShadow(mapSize: number, viewportScale: number): boolean {
  return mapSize * viewportScale >= MIN_SHADOW_SCREEN_PX
}
