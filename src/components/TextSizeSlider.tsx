import { useAppStore } from '../store'
import {
  ANNOTATION_TEXT_SCALE_MAX,
  ANNOTATION_TEXT_SCALE_MIN,
  ANNOTATION_TEXT_SCALE_STEP,
} from '../utils/annotationTextScale'

/** Slider for the comment and sidebar text size. Shared by the status bar and the touch Style sheet. */
export default function TextSizeSlider({
  label,
  className = 'statusbar-font',
}: {
  label: string
  className?: string
}) {
  const textScalePct = useAppStore((s) => s.annotationTextScalePct)
  const setAnnotationTextScalePct = useAppStore(
    (s) => s.setAnnotationTextScalePct,
  )

  return (
    <label className={className}>
      <span>{label}</span>
      <input
        className="statusbar-font-slider"
        type="range"
        min={ANNOTATION_TEXT_SCALE_MIN}
        max={ANNOTATION_TEXT_SCALE_MAX}
        step={ANNOTATION_TEXT_SCALE_STEP}
        value={textScalePct}
        aria-label={label}
        aria-valuemin={ANNOTATION_TEXT_SCALE_MIN}
        aria-valuemax={ANNOTATION_TEXT_SCALE_MAX}
        aria-valuenow={textScalePct}
        aria-valuetext={`${textScalePct}%`}
        onChange={(e) => setAnnotationTextScalePct(Number(e.target.value))}
      />
      <span className="statusbar-font-value">{textScalePct}%</span>
    </label>
  )
}
