import { useState, type CSSProperties } from 'react'

interface DualRangeSliderProps {
  min: number
  max: number
  step: number
  valueMin: number
  valueMax: number
  onChangeMin: (value: number) => void
  onChangeMax: (value: number) => void
  ariaLabelMin?: string
  ariaLabelMax?: string
  className?: string
}

export default function DualRangeSlider({
  min,
  max,
  step,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  ariaLabelMin = 'Minimum',
  ariaLabelMax = 'Maximum',
  className,
}: DualRangeSliderProps) {
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null)
  const span = max - min || 1
  const leftPct = ((valueMin - min) / span) * 100
  const rightPct = ((valueMax - min) / span) * 100

  return (
    <div
      className={`dual-range${className ? ` ${className}` : ''}`}
      style={
        {
          '--dual-left': `${leftPct}%`,
          '--dual-right': `${rightPct}%`,
        } as CSSProperties
      }
    >
      <input
        type="range"
        className="dual-range-input dual-range-input-min"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        aria-label={ariaLabelMin}
        style={{ zIndex: activeThumb === 'min' || valueMin > min + span * 0.5 ? 3 : 2 }}
        onPointerDown={() => setActiveThumb('min')}
        onPointerUp={() => setActiveThumb(null)}
        onChange={(e) => {
          const next = Math.min(Number(e.target.value), valueMax - step)
          onChangeMin(next)
        }}
      />
      <input
        type="range"
        className="dual-range-input dual-range-input-max"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        aria-label={ariaLabelMax}
        style={{ zIndex: activeThumb === 'max' || valueMin <= min + span * 0.5 ? 3 : 2 }}
        onPointerDown={() => setActiveThumb('max')}
        onPointerUp={() => setActiveThumb(null)}
        onChange={(e) => {
          const next = Math.max(Number(e.target.value), valueMin + step)
          onChangeMax(next)
        }}
      />
    </div>
  )
}
