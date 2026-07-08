import { SWATCHES } from '../config/tools'
import { useAppStore } from '../store'
import Tooltip from './Tooltip'
import type { LayoutMode } from '../hooks/useLayoutMode'

export default function StrokeSettings({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const strokeWidth = useAppStore((s) => s.strokeWidth)
  const setStrokeWidth = useAppStore((s) => s.setStrokeWidth)
  const strokeColor = useAppStore((s) => s.strokeColor)
  const setStrokeColor = useAppStore((s) => s.setStrokeColor)
  const strokeOpacity = useAppStore((s) => s.strokeOpacity)
  const setStrokeOpacity = useAppStore((s) => s.setStrokeOpacity)

  const isTouch = layoutMode === 'touch'

  if (isTouch) {
    return (
      <div className="stroke-settings-touch">
        <div className="tool-section tool-section-horizontal">
          <label className="tool-label" htmlFor="stroke-width">
            Width
          </label>
          <input
            id="stroke-width"
            type="range"
            min={1}
            max={20}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />
          <span className="tool-value">{strokeWidth}px</span>
        </div>
        <div className="tool-section tool-section-horizontal">
          <label className="tool-label" htmlFor="stroke-opacity">
            Opacity
          </label>
          <input
            id="stroke-opacity"
            type="range"
            min={10}
            max={100}
            value={Math.round(strokeOpacity * 100)}
            onChange={(e) => setStrokeOpacity(Number(e.target.value) / 100)}
          />
          <span className="tool-value">{Math.round(strokeOpacity * 100)}%</span>
        </div>
        <div className="tool-section tool-section-horizontal">
          <span className="tool-label">Color</span>
          <div className="swatches swatches-row">
            {SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                className={`swatch${strokeColor === color ? ' active' : ''}`}
                style={{ background: color }}
                aria-label={`Color ${color}`}
                onClick={() => setStrokeColor(color)}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Tooltip content="Line and marker stroke width" side="right">
        <div className="tool-section">
          <label className="tool-label" htmlFor="stroke-width">
            Width
          </label>
          <input
            id="stroke-width"
            type="range"
            min={1}
            max={20}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
          />
          <span className="tool-value">{strokeWidth}px</span>
        </div>
      </Tooltip>
      <Tooltip content="Transparency for drawn lines and markers" side="right">
        <div className="tool-section">
          <label className="tool-label" htmlFor="stroke-opacity">
            Opacity
          </label>
          <input
            id="stroke-opacity"
            type="range"
            min={10}
            max={100}
            value={Math.round(strokeOpacity * 100)}
            onChange={(e) => setStrokeOpacity(Number(e.target.value) / 100)}
          />
          <span className="tool-value">{Math.round(strokeOpacity * 100)}%</span>
        </div>
      </Tooltip>
      <div className="tool-section">
        <span className="tool-label">Color</span>
        <div className="swatches">
          {SWATCHES.map((color) => (
            <Tooltip key={color} content={`Use ${color}`} side="right">
              <button
                type="button"
                className={`swatch${strokeColor === color ? ' active' : ''}`}
                style={{ background: color }}
                aria-label={`Color ${color}`}
                onClick={() => setStrokeColor(color)}
              />
            </Tooltip>
          ))}
        </div>
      </div>
    </>
  )
}
