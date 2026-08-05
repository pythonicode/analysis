import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'

function clampByte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((n) => clampByte(n).toString(16).padStart(2, '0'))
      .join('')
  )
}

export default function ColorPickerModal({
  initialColor,
  onApply,
  onClose,
}: {
  initialColor: string
  onApply: (color: string) => void
  onClose: () => void
}) {
  const parsed = hexToRgb(initialColor) ?? { r: 8, g: 6, b: 13 }
  const [r, setR] = useState(parsed.r)
  const [g, setG] = useState(parsed.g)
  const [b, setB] = useState(parsed.b)
  const [hexInput, setHexInput] = useState(rgbToHex(parsed.r, parsed.g, parsed.b))

  const hex = rgbToHex(r, g, b)

  useEffect(() => {
    setHexInput(hex)
  }, [hex])

  const handleApply = useCallback(() => {
    onApply(hex)
  }, [hex, onApply])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter') handleApply()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleApply, onClose])

  const updateChannel = (channel: 'r' | 'g' | 'b', value: number) => {
    const next = clampByte(value)
    if (channel === 'r') setR(next)
    if (channel === 'g') setG(next)
    if (channel === 'b') setB(next)
  }

  const applyHexInput = (value: string) => {
    setHexInput(value)
    const rgb = hexToRgb(value)
    if (!rgb) return
    setR(rgb.r)
    setG(rgb.g)
    setB(rgb.b)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-color-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="color-picker-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="color-picker-modal-title">Custom color</h2>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="modal-body color-picker-body">
          <div
            className="color-picker-preview"
            style={{ background: hex }}
            aria-hidden
          />

          <div className="color-picker-channels">
            {(
              [
                { key: 'r', label: 'R', value: r, accent: '#e11d48' },
                { key: 'g', label: 'G', value: g, accent: '#16a34a' },
                { key: 'b', label: 'B', value: b, accent: '#2563eb' },
              ] as const
            ).map(({ key, label, value, accent }) => (
              <label key={key} className="color-picker-channel">
                <span className="color-picker-channel-label">{label}</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={value}
                  style={{ accentColor: accent }}
                  onChange={(e) => updateChannel(key, Number(e.target.value))}
                  aria-label={`${label} channel`}
                />
                <input
                  type="number"
                  className="color-picker-channel-number"
                  min={0}
                  max={255}
                  value={value}
                  onChange={(e) => updateChannel(key, Number(e.target.value))}
                  aria-label={`${label} value`}
                />
              </label>
            ))}
          </div>

          <label className="color-picker-hex">
            <span className="color-picker-channel-label">Hex</span>
            <input
              type="text"
              value={hexInput}
              spellCheck={false}
              onChange={(e) => applyHexInput(e.target.value)}
              aria-label="Hex color"
            />
          </label>
        </div>

        <div className="modal-actions modal-actions-split">
          <div className="modal-actions-group">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="button button-primary"
              onClick={handleApply}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
