import type Konva from 'konva'

/** Shared handle to the live Konva stage so non-canvas code (export, centering) can reach it. */
export const stageRef: { current: Konva.Stage | null } = { current: null }
