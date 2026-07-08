import { TOOLS, getToolTip } from '../config/tools'
import type { LayoutMode } from '../hooks/useLayoutMode'
import { useAppStore } from '../store'
import StrokeSettings from './StrokeSettings'
import Tooltip from './Tooltip'

export default function ToolPalette({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const activeTool = useAppStore((s) => s.activeTool)
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const hasTracks = useAppStore((s) => s.tracks.length > 0)

  return (
    <aside className="tool-palette">
      <div className="tool-buttons" role="toolbar" aria-label="Drawing tools">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <Tooltip
            key={id}
            content={
              id === 'gpx' && !hasTracks
                ? 'Import a GPX file first'
                : getToolTip(id, layoutMode)
            }
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

      <StrokeSettings layoutMode={layoutMode} />
    </aside>
  )
}
