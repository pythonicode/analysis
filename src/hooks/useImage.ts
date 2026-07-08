import { useEffect, useState } from 'react'

/** Loads an HTMLImageElement from a URL for use with Konva's Image node. */
export function useImage(src: string | null): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!src) {
      setImage(null)
      return
    }
    const img = new window.Image()
    img.onload = () => setImage(img)
    img.src = src
    return () => {
      img.onload = null
      setImage(null)
    }
  }, [src])

  return image
}
