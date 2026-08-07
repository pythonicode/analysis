import { useEffect } from 'react'
import { TOOLS, getToolByHotkey, getToolTip } from '../config/tools'
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (
        el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable)
      ) {
        return
      }
      if (document.querySelector('[role="dialog"]')) return

      const tool = getToolByHotkey(e.key)
      if (!tool) return
      if (tool.id === 'gpx' && useAppStore.getState().tracks.length === 0) return

      e.preventDefault()
      setActiveTool(tool.id)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setActiveTool])

  return (
    <aside className="tool-palette">
      <div className="tool-buttons" role="toolbar" aria-label="Drawing tools">
        {TOOLS.map(({ id, label, hotkey, icon: Icon }) => {
          const tip =
            id === 'gpx' && !hasTracks
              ? 'Import a GPX file first'
              : `${getToolTip(id, layoutMode)} (${hotkey})`

          return (
            <Tooltip key={id} content={tip} side="right">
              <button
                type="button"
                className={`tool-button${activeTool === id ? ' active' : ''}`}
                aria-label={label}
                aria-keyshortcuts={hotkey}
                aria-pressed={activeTool === id}
                disabled={id === 'gpx' && !hasTracks}
                onClick={() => setActiveTool(id)}
              >
                <Icon size={18} aria-hidden />
                <span className="tool-hotkey" aria-hidden>
                  {hotkey}
                </span>
              </button>
            </Tooltip>
          )
        })}
      </div>

      <StrokeSettings layoutMode={layoutMode} />
    </aside>
  )
}
