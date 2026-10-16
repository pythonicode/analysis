import { useState } from 'react'
import { SWATCHES } from '../config/tools'
import { useAppStore } from '../store'
import ColorPickerModal from './ColorPickerModal'
import Tooltip from './Tooltip'
import type { LayoutMode } from '../hooks/useLayoutMode'
import { useT } from '../i18n'

const DEFAULT_CUSTOM_COLOR = '#08060d'

export default function StrokeSettings({
  layoutMode,
}: {
  layoutMode: LayoutMode
}) {
  const t = useT()
  const strokeWidth = useAppStore((s) => s.strokeWidth)
  const setStrokeWidth = useAppStore((s) => s.setStrokeWidth)
  const strokeColor = useAppStore((s) => s.strokeColor)
  const setStrokeColor = useAppStore((s) => s.setStrokeColor)
  const strokeOpacity = useAppStore((s) => s.strokeOpacity)
  const setStrokeOpacity = useAppStore((s) => s.setStrokeOpacity)

  const [customColor, setCustomColor] = useState(() =>
    SWATCHES.includes(strokeColor) ? DEFAULT_CUSTOM_COLOR : strokeColor,
  )
  const [pickerOpen, setPickerOpen] = useState(false)

  const isTouch = layoutMode === 'touch'
  const isCustomActive = !SWATCHES.includes(strokeColor)

  const applyCustomColor = (color: string) => {
    setCustomColor(color)
    setStrokeColor(color)
    setPickerOpen(false)
  }

  const customSwatch = (
    <button
      type="button"
      className={`swatch swatch-custom${isCustomActive ? ' active' : ''}`}
      aria-label={t('stroke.custom')}
      aria-pressed={isCustomActive}
      onClick={() => setPickerOpen(true)}
    >
      <span
        className="swatch-custom-fill"
        style={{ background: isCustomActive ? strokeColor : customColor }}
      />
    </button>
  )

  const colorPickerModal = pickerOpen ? (
    <ColorPickerModal
      initialColor={isCustomActive ? strokeColor : customColor}
      onApply={applyCustomColor}
      onClose={() => setPickerOpen(false)}
    />
  ) : null

  if (isTouch) {
    return (
      <div className="stroke-settings-touch">
        <div className="tool-section tool-section-horizontal">
          <label className="tool-label" htmlFor="stroke-width">
            {t('stroke.width')}
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
            {t('stroke.opacity')}
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
          <span className="tool-label">{t('stroke.color')}</span>
          <div className="swatches swatches-row">
            {SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                className={`swatch${strokeColor === color ? ' active' : ''}`}
                style={{ background: color }}
                aria-label={t('stroke.colorAria', { color })}
                onClick={() => setStrokeColor(color)}
              />
            ))}
            {customSwatch}
          </div>
        </div>
        {colorPickerModal}
      </div>
    )
  }

  return (
    <>
      <Tooltip content={t('stroke.widthHint')} side="right">
        <div className="tool-section">
          <label className="tool-label" htmlFor="stroke-width">
            {t('stroke.width')}
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
      <Tooltip content={t('stroke.opacityHint')} side="right">
        <div className="tool-section">
          <label className="tool-label" htmlFor="stroke-opacity">
            {t('stroke.opacity')}
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
        <span className="tool-label">{t('stroke.color')}</span>
        <div className="swatches">
          {SWATCHES.map((color) => (
            <Tooltip key={color} content={t('stroke.useColor', { color })} side="right">
              <button
                type="button"
                className={`swatch${strokeColor === color ? ' active' : ''}`}
                style={{ background: color }}
                aria-label={t('stroke.colorAria', { color })}
                onClick={() => setStrokeColor(color)}
              />
            </Tooltip>
          ))}
          <Tooltip content={t('stroke.customHint')} side="right">
            {customSwatch}
          </Tooltip>
        </div>
      </div>
      {colorPickerModal}
    </>
  )
}
