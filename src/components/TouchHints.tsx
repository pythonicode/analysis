import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIsTouchLayout } from '../hooks/useLayoutMode'

const STORAGE_KEY = 'touch-hints-dismissed'

export default function TouchHints() {
  const isTouch = useIsTouchLayout()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isTouch) return
    if (localStorage.getItem(STORAGE_KEY)) return
    setVisible(true)
  }, [isTouch])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="touch-hints" role="status">
      <p>
        Pinch to zoom, use two fingers to pan. Tap a tool, then tap the map to
        draw or place markers.
      </p>
      <button
        type="button"
        className="touch-hints-dismiss"
        aria-label="Dismiss tips"
        onClick={dismiss}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}
