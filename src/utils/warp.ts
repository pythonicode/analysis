import type { GpxAnchor, Point } from '../types'

/**
 * Warps a flattened polyline so that each anchor's source point lands on its
 * target point, deforming the rest of the line smoothly:
 * - 0 anchors: identity
 * - 1 anchor: translation
 * - 2 anchors: similarity transform (translate + rotate + uniform scale)
 * - 3+ anchors: thin-plate spline interpolation
 */
export function warpPoints(points: number[], anchors: GpxAnchor[]): number[] {
  if (anchors.length === 0) return points

  if (anchors.length === 1) {
    const { source, target } = anchors[0]
    const dx = target.x - source.x
    const dy = target.y - source.y
    return points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy))
  }

  if (anchors.length === 2) {
    return similarityWarp(points, anchors)
  }

  return thinPlateSplineWarp(points, anchors)
}

/**
 * Exact similarity transform through two point pairs, using complex-number
 * math: f(z) = t1 + a (z - s1) with a = (t2 - t1) / (s2 - s1).
 */
function similarityWarp(points: number[], anchors: GpxAnchor[]): number[] {
  const [a1, a2] = anchors
  const sdx = a2.source.x - a1.source.x
  const sdy = a2.source.y - a1.source.y
  const denom = sdx * sdx + sdy * sdy
  if (denom < 1e-12) {
    // Degenerate (both anchors on the same source point): translate only
    return warpPoints(points, [a1])
  }
  const tdx = a2.target.x - a1.target.x
  const tdy = a2.target.y - a1.target.y
  // a = (t2 - t1) / (s2 - s1) as complex division
  const ar = (tdx * sdx + tdy * sdy) / denom
  const ai = (tdy * sdx - tdx * sdy) / denom

  const out = new Array<number>(points.length)
  for (let i = 0; i < points.length; i += 2) {
    const zx = points[i] - a1.source.x
    const zy = points[i + 1] - a1.source.y
    out[i] = a1.target.x + ar * zx - ai * zy
    out[i + 1] = a1.target.y + ar * zy + ai * zx
  }
  return out
}

/** TPS radial basis kernel U(r^2) = r^2 log r, expressed via squared distance. */
function kernel(r2: number): number {
  return r2 > 1e-12 ? 0.5 * r2 * Math.log(r2) : 0
}

/**
 * Thin-plate spline with affine part. Solves
 *   [K + lambda*I  P] [w]   [v]
 *   [P^T           0] [a] = [0]
 * once per output dimension (shared factorization via multi-RHS elimination).
 */
function thinPlateSplineWarp(points: number[], anchors: GpxAnchor[]): number[] {
  const n = anchors.length
  const size = n + 3
  const lambda = 1e-6

  // Normalize coordinates to keep the system well conditioned
  let scale = 0
  for (const a of anchors) {
    scale = Math.max(scale, Math.abs(a.source.x), Math.abs(a.source.y))
  }
  if (scale < 1e-9) scale = 1
  const sx = anchors.map((a) => a.source.x / scale)
  const sy = anchors.map((a) => a.source.y / scale)

  // Build the augmented system with two right-hand sides (target x and y)
  const m: number[][] = Array.from({ length: size }, () =>
    new Array<number>(size + 2).fill(0),
  )
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dx = sx[i] - sx[j]
      const dy = sy[i] - sy[j]
      m[i][j] = kernel(dx * dx + dy * dy) + (i === j ? lambda : 0)
    }
    m[i][n] = 1
    m[i][n + 1] = sx[i]
    m[i][n + 2] = sy[i]
    m[n][i] = 1
    m[n + 1][i] = sx[i]
    m[n + 2][i] = sy[i]
    m[i][size] = anchors[i].target.x / scale
    m[i][size + 1] = anchors[i].target.y / scale
  }

  if (!solveInPlace(m, size, 2)) {
    // Singular system (e.g. collinear duplicate sources): fall back
    return similarityWarp(points, [anchors[0], anchors[n - 1]])
  }

  const wx = m.map((row) => row[size])
  const wy = m.map((row) => row[size + 1])

  const out = new Array<number>(points.length)
  for (let i = 0; i < points.length; i += 2) {
    const px = points[i] / scale
    const py = points[i + 1] / scale
    let ox = wx[n] + wx[n + 1] * px + wx[n + 2] * py
    let oy = wy[n] + wy[n + 1] * px + wy[n + 2] * py
    for (let k = 0; k < n; k++) {
      const dx = px - sx[k]
      const dy = py - sy[k]
      const u = kernel(dx * dx + dy * dy)
      ox += wx[k] * u
      oy += wy[k] * u
    }
    out[i] = ox * scale
    out[i + 1] = oy * scale
  }
  return out
}

/**
 * Gaussian elimination with partial pivoting on an augmented matrix
 * (`size` columns + `rhsCount` right-hand sides). Returns false if singular.
 */
function solveInPlace(m: number[][], size: number, rhsCount: number): boolean {
  const cols = size + rhsCount
  for (let col = 0; col < size; col++) {
    let pivot = col
    for (let row = col + 1; row < size; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return false
    if (pivot !== col) {
      const tmp = m[col]
      m[col] = m[pivot]
      m[pivot] = tmp
    }
    for (let row = 0; row < size; row++) {
      if (row === col) continue
      const factor = m[row][col] / m[col][col]
      if (factor === 0) continue
      for (let c = col; c < cols; c++) {
        m[row][c] -= factor * m[col][c]
      }
    }
  }
  for (let row = 0; row < size; row++) {
    const d = m[row][row]
    for (let c = size; c < cols; c++) {
      m[row][c] /= d
    }
  }
  return true
}

/** Index of the polyline vertex closest to `p`, with its coordinates. */
export function nearestVertex(
  points: number[],
  p: Point,
): { index: number; x: number; y: number } {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < points.length; i += 2) {
    const d = (points[i] - p.x) ** 2 + (points[i + 1] - p.y) ** 2
    if (d < bestDist) {
      bestDist = d
      best = i / 2
    }
  }
  return { index: best, x: points[best * 2], y: points[best * 2 + 1] }
}
