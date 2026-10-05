import { RotateCcw } from 'lucide-react'
import { useAppStore } from '../store'
import { stageRef } from '../stageRef'
import { clampRotation, rotateViewportKeepingCenter } from '../utils/viewport'

const MIN_ROTATION = -360
const MAX_ROTATION = 360

export default function CanvasRotationControl({
  compact = false,
}: {
  compact?: boolean
}) {
  const mapImage = useAppStore((s) => s.mapImage)
  const rotation = useAppStore((s) => s.viewport.rotation)
  const setViewport = useAppStore((s) => s.setViewport)

  if (!mapImage) return null

  const applyRotation = (degrees: number) => {
    const nextRotation = clampRotation(degrees)
    const stored = useAppStore.getState().viewport
    const stage = stageRef.current
    const viewport = stage
      ? {
          ...stored,
          scale: stage.scaleX(),
          x: stage.x(),
          y: stage.y(),
        }
      : stored
    const mapCenter = { x: mapImage.width / 2, y: mapImage.height / 2 }
    if (stage) {
      setViewport(
        rotateViewportKeepingCenter(
          viewport,
          nextRotation,
          mapCenter,
          { x: stage.width() / 2, y: stage.height() / 2 },
        ),
      )
      return
    }
    setViewport({ ...viewport, rotation: nextRotation })
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
        value={rotation}
        aria-valuemin={MIN_ROTATION}
        aria-valuemax={MAX_ROTATION}
        aria-valuenow={rotation}
        aria-valuetext={`${rotation} degrees`}
        onChange={(e) => applyRotation(Number(e.target.value))}
      />
      <span className="canvas-rotation-value">{rotation}°</span>
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
