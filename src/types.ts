export type Tool = 'select' | 'pan' | 'line' | 'marker' | 'eraser' | 'gpx'

export type MarkerDisplayMode = 'labels' | 'comments'

export interface Point {
  x: number
  y: number
}

export interface Viewport {
  scale: number
  x: number
  y: number
  /** Clockwise rotation in whole degrees around the map center */
  rotation: number
}

export interface DrawnPath {
  id: string
  /** Flattened [x1, y1, x2, y2, ...] points in map coordinates */
  points: number[]
  width: number
  color: string
  /** 0..1 stroke opacity */
  opacity: number
}

/** Pins a vertex of the source polyline (`source`) to a map position (`target`). */
export interface GpxAnchor {
  source: Point
  target: Point
}

export interface GpxTrack {
  id: string
  name: string
  /** Flattened [x1, y1, ...] source points in map coordinates (initial fit baked in) */
  points: number[]
  /** Georeferencing control points; rendered geometry is warp(points, anchors) */
  anchors: GpxAnchor[]
  color: string
  /** 0..1 track opacity */
  opacity: number
  /** Stroke width in map units; omitted in older saved projects */
  width?: number
  /** Epoch ms from GPX `<time>` per vertex; length = points.length / 2 */
  vertexTimes?: number[]
  /** Cumulative geodesic distance in meters per vertex; length = points.length / 2 */
  vertexDistances?: number[]
}

export interface Annotation {
  id: string
  /** Marker position in map coordinates */
  position: Point
  comment: string
  /** Marker radius in map units, captured from the width setting at placement */
  size: number
  color: string
  /** Text wrap width for inline comment boxes on the map; height follows content */
  commentBoxWidth?: number
}

export interface MapImage {
  /** Object URL or data URL of the imported image */
  src: string
  width: number
  height: number
  name: string
}
