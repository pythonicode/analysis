import type Konva from 'konva'

/** Rotated map-content group; used to map screen pointers into map coordinates. */
export const contentGroupRef: { current: Konva.Group | null } = { current: null }
