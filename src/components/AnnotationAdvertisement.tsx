import { useMemo } from 'react'
import { pickAdvertisement } from '../advertisements'
import { AnalyticsEvents, trackEvent } from '../analytics'
import { usePrefersDarkScheme } from '../hooks/usePrefersDarkScheme'

export default function AnnotationAdvertisement() {
  const ad = useMemo(() => pickAdvertisement(), [])
  const prefersDark = usePrefersDarkScheme()

  if (!ad) return null

  const imageSrc =
    prefersDark && ad.imageSrcDark ? ad.imageSrcDark : ad.imageSrc
  const autoDim = prefersDark && !ad.imageSrcDark

  return (
    <div className="annotation-ad-slot">
      <a
        className={`annotation-ad${autoDim ? ' annotation-ad-auto-dim' : ''}`}
        href={ad.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ad.alt}
        onClick={() => trackEvent(AnalyticsEvents.ADVERTISEMENT_CLICK, { ad_id: ad.id })}
      >
        <img src={imageSrc} alt="" />
      </a>
    </div>
  )
}
