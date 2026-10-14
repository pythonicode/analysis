/**
 * iOS Safari cannot allocate canvases above ~16.7M pixels and fails silently
 * (blank or "data:," output), so exports on iOS are scaled down to fit.
 * Desktop browsers handle far larger canvases, so they keep full resolution.
 */
export const IOS_MAX_EXPORT_PIXELS = 16_000_000

/** iPadOS reports a desktop user agent, so touch points are also checked. */
export function isIosDevice(
  userAgent: string,
  maxTouchPoints: number,
): boolean {
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  )
}

/** Scale factor (<= 1) that keeps a width x height export within the device's canvas limit. */
export function exportScaleFor(
  width: number,
  height: number,
  device: { userAgent: string; maxTouchPoints: number } = currentDevice(),
): number {
  if (!isIosDevice(device.userAgent, device.maxTouchPoints)) return 1
  const area = width * height
  return area > IOS_MAX_EXPORT_PIXELS
    ? Math.sqrt(IOS_MAX_EXPORT_PIXELS / area)
    : 1
}

function currentDevice(): { userAgent: string; maxTouchPoints: number } {
  if (typeof navigator === 'undefined') {
    return { userAgent: '', maxTouchPoints: 0 }
  }
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
  }
}
