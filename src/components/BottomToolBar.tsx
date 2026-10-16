import { useState } from 'react'
import { MessageSquareText, Settings } from 'lucide-react'
import { TOOLS, getToolTip } from '../config/tools'
import { useAppStore } from '../store'
import BottomSheet from './BottomSheet'
import StrokeSettings from './StrokeSettings'
import CanvasRotationControl from './CanvasRotationControl'
import { useT } from '../i18n'
import TextSizeSlider from './TextSizeSlider'
import LanguageSelect from './LanguageSelect'

export default function BottomToolBar() {
  const activeTool = useAppStore((s) => s.activeTool)
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const hasTracks = useAppStore((s) => s.tracks.length > 0)
  const annotations = useAppStore((s) => s.annotations)
  const annotationsOpen = useAppStore((s) => s.annotationsOpen)
  const toggleAnnotations = useAppStore((s) => s.toggleAnnotations)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const t = useT()

  return (
    <>
      <nav className="bottom-toolbar" aria-label={t('toolbar.drawingTools')}>
        <div className="bottom-toolbar-tools" role="toolbar">
          {TOOLS.map(({ id, label, shortLabel, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`bottom-tool-button${activeTool === id ? ' active' : ''}`}
              aria-label={t(label)}
              aria-pressed={activeTool === id}
              title={getToolTip(id, 'touch')}
              disabled={id === 'gpx' && !hasTracks}
              onClick={() => setActiveTool(id)}
            >
              <Icon size={20} aria-hidden />
              <span className="bottom-tool-label">{t(shortLabel)}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="bottom-tool-button bottom-tool-extra"
          aria-label={t('toolbar.strokeSettings')}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings size={20} aria-hidden />
          <span className="bottom-tool-label">{t('toolbar.style')}</span>
        </button>

        <button
          type="button"
          className={`bottom-tool-button bottom-tool-extra${annotationsOpen ? ' active' : ''}`}
          aria-label={t('toolbar.annotations')}
          aria-pressed={annotationsOpen}
          onClick={toggleAnnotations}
        >
          <MessageSquareText size={20} aria-hidden />
          <span className="bottom-tool-label">{t('toolbar.notes')}</span>
          {annotations.length > 0 && (
            <span className="bottom-tool-badge">{annotations.length}</span>
          )}
        </button>
      </nav>

      {settingsOpen && (
        <BottomSheet title={t('toolbar.viewAndStroke')} onClose={() => setSettingsOpen(false)}>
          <CanvasRotationControl compact />
          <LanguageSelect className="style-sheet-language" />
          <TextSizeSlider label={t('style.commentTextSize')} className="style-sheet-text-size" />
          <StrokeSettings layoutMode="touch" />
        </BottomSheet>
      )}
    </>
  )
}
