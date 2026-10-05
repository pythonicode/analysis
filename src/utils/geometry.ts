/** Perpendicular distance from point (px, py) to segment (ax, ay)-(bx, by). */
function pointSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * Ramer-Douglas-Peucker simplification on a flattened [x1, y1, x2, y2, ...] polyline.
 * Returns kept vertex indices; endpoints are always kept.
 */
export function simplifyPathIndices(points: number[], epsilon: number): number[] {
  const n = points.length / 2
  if (n <= 2) {
    const indices: number[] = []
    for (let i = 0; i < n; i++) indices.push(i)
    return indices
  }

  const keep = new Array<boolean>(n).fill(false)
  keep[0] = true
  keep[n - 1] = true

  const stack: [number, number][] = [[0, n - 1]]
  while (stack.length > 0) {
    const [start, end] = stack.pop()!
    let maxDist = 0
    let maxIndex = -1
    for (let i = start + 1; i < end; i++) {
      const d = pointSegmentDistance(
        points[i * 2],
        points[i * 2 + 1],
        points[start * 2],
        points[start * 2 + 1],
        points[end * 2],
        points[end * 2 + 1],
      )
      if (d > maxDist) {
        maxDist = d
        maxIndex = i
      }
    }
    if (maxDist > epsilon && maxIndex !== -1) {
      keep[maxIndex] = true
      stack.push([start, maxIndex], [maxIndex, end])
    }
  }

  const indices: number[] = []
  for (let i = 0; i < n; i++) {
    if (keep[i]) indices.push(i)
  }
  return indices
}

/**
 * Ramer-Douglas-Peucker simplification on a flattened [x1, y1, x2, y2, ...] polyline.
 * Returns a new flattened array; endpoints are always kept.
 */
export function simplifyPath(points: number[], epsilon: number): number[] {
  const indices = simplifyPathIndices(points, epsilon)
  const result: number[] = []
  for (const index of indices) {
    result.push(points[index * 2]!, points[index * 2 + 1]!)
  }
  return result
}

/** Flattened points plus the source vertex index of each kept point. */
export function simplifyPathKeepingIndices(
  points: number[],
  epsilon: number,
): { points: number[]; indices: number[] } {
  const indices = simplifyPathIndices(points, epsilon)
  const simplified: number[] = []
  for (const index of indices) {
    simplified.push(points[index * 2]!, points[index * 2 + 1]!)
  }
  return { points: simplified, indices }
}
