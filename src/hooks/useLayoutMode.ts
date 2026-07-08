import { useEffect, useState } from 'react'

export type LayoutMode = 'desktop' | 'compact' | 'touch'

function getLayoutMode(): LayoutMode {
  const width = window.innerWidth
  if (width >= 1280) return 'desktop'
  if (width >= 1024) return 'compact'
  return 'touch'
}

export function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(getLayoutMode)

  useEffect(() => {
    const update = () => setMode(getLayoutMode())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return mode
}

export function useIsTouchLayout(): boolean {
  return useLayoutMode() === 'touch'
}
