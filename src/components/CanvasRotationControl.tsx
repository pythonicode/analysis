import { RotateCcw } from 'lucide-react'
import { useAppStore } from '../store'
import { clampRotation } from '../utils/viewport'

const MIN_ROTATION = -360
const MAX_ROTATION = 360

export default function CanvasRotationControl({
  compact = false,
}: {
  compact?: boolean
}) {
  const mapImage = useAppStore((s) => s.mapImage)
  const viewport = useAppStore((s) => s.viewport)
  const setViewport = useAppStore((s) => s.setViewport)

  if (!mapImage) return null

  const applyRotation = (degrees: number) => {
    setViewport({ ...viewport, rotation: clampRotation(degrees) })
  }

  return (
    <div
      className={`canvas-rotation-control${compact ? ' canvas-rotation-control-compact' : ''}`}
      role="group"
      aria-label="Canvas rotation"
    >
      <label className="canvas-rotation-label" htmlFor="canvas-rotation">
        {compact ? 'Rotation' : 'Rotate'}
      </label>
      <input
        id="canvas-rotation"
        className="canvas-rotation-slider"
        type="range"
        min={MIN_ROTATION}
        max={MAX_ROTATION}
        step={1}
        value={viewport.rotation}
        aria-valuemin={MIN_ROTATION}
        aria-valuemax={MAX_ROTATION}
        aria-valuenow={viewport.rotation}
        aria-valuetext={`${viewport.rotation} degrees`}
        onChange={(e) => applyRotation(Number(e.target.value))}
      />
      <span className="canvas-rotation-value">{viewport.rotation}°</span>
      <button
        type="button"
        className="canvas-rotation-reset"
        aria-label="Reset rotation to 0 degrees"
        title="Reset rotation"
        onClick={() => applyRotation(0)}
      >
        <RotateCcw size={14} aria-hidden />
      </button>
    </div>
  )
}
