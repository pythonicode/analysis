import {
  Anchor,
  Eraser,
  Hand,
  MapPin,
  MousePointer2,
  Pencil,
} from 'lucide-react'
import { useAppStore } from '../store'
import type { Tool } from '../types'
import Tooltip from './Tooltip'

const TOOLS: {
  id: Tool
  label: string
  tip: string
  icon: typeof Hand
}[] = [
  {
    id: 'select',
    label: 'Select',
    tip: 'Click paths or markers to select them. Press Delete to remove.',
    icon: MousePointer2,
  },
  {
    id: 'pan',
    label: 'Pan',
    tip: 'Drag the map to move around. Hold Space for temporary pan.',
    icon: Hand,
  },
  {
    id: 'line',
    label: 'Draw',
    tip: 'Click and drag to draw lines on the map.',
    icon: Pencil,
  },
  {
    id: 'marker',
    label: 'Marker',
    tip: 'Click to place a numbered marker with a comment.',
    icon: MapPin,
  },
  {
    id: 'eraser',
    label: 'Eraser',
    tip: 'Click or drag over paths and markers to remove them.',
    icon: Eraser,
  },
  {
    id: 'gpx',
    label: 'Adjust GPX',
    tip: 'Drag anchor pins to warp the GPX track onto the map.',
    icon: Anchor,
  },
]

const SWATCHES = ['#e11d48', '#2563eb', '#16a34a', '#f59e0b', '#08060d']

export default function ToolPalette() {
  const activeTool = useAppStore((s) => s.activeTool)
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const hasTracks = useAppStore((s) => s.tracks.length > 0)
  const strokeWidth = useAppStore((s) => s.strokeWidth)
  const setStrokeWidth = useAppStore((s) => s.setStrokeWidth)
  const strokeColor = useAppStore((s) => s.strokeColor)
  const setStrokeColor = useAppStore((s) => s.setStrokeColor)
  const strokeOpacity = useAppStore((s) => s.strokeOpacity)
  const setStrokeOpacity = useAppStore((s) => s.setStrokeOpacity)

  return (
    <aside className="tool-palette">
      <div className="tool-buttons" role="toolbar" aria-label="Drawing tools">
        {TOOLS.map(({ id, label, tip, icon: Icon }) => (
          <Tooltip
            key={id}
            content={id === 'gpx' && !hasTracks ? 'Import a GPX file first' : tip}
            side="right"
          >
            <button
              type="button"
              className={`tool-button${activeTool === id ? ' active' : ''}`}
              aria-label={label}
              aria-pressed={activeTool === id}
              disabled={id === 'gpx' && !hasTracks}
              onClick={() => setActiveTool(id)}
            >
              <Icon size={18} aria-hidden />
            </button>
          </Tooltip>
        ))}
      </div>

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
    </aside>
  )
}
