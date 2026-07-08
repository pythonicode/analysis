import { useEffect, useState } from 'react'

function detectMobile(): boolean {
  const ua = navigator.userAgent

  // Common phone user agents
  if (/Android.+Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true
  }

  // Narrow touch screens (covers phones whose UA is not clearly mobile)
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
  const isNarrow = window.matchMedia('(max-width: 768px)').matches

  return isTouchDevice && isNarrow
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(detectMobile)

  useEffect(() => {
    const update = () => setIsMobile(detectMobile())

    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return isMobile
}
