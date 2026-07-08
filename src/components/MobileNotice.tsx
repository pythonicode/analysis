import { Monitor } from 'lucide-react'

export default function MobileNotice() {
  return (
    <div className="mobile-notice">
      <div className="mobile-notice-card">
        <Monitor size={40} strokeWidth={1.5} aria-hidden />
        <h1>Desktop required</h1>
        <p>
          The Orienteering Analysis Tool is designed for desktop and laptop
          computers. Please open this page on a PC or Mac for the full
          experience.
        </p>
      </div>
    </div>
  )
}
