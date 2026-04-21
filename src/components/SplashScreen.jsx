// SplashScreen.jsx — Full-screen branded hold (1.8s) then 300ms fade, calls onDone
import { useState, useEffect } from 'react'

export default function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const holdTimer = setTimeout(() => setFading(true), 1800)
    const doneTimer = setTimeout(() => onDone(), 2100)
    return () => {
      clearTimeout(holdTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0A0A0A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: fading ? 0 : 1,
        transition: 'opacity 300ms ease-out',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--color-accent)',
          letterSpacing: '-0.02em',
        }}
      >
        Explore Eire
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 400,
          color: '#6B7280',
        }}
      >
        Ireland's outdoor map
      </span>
    </div>
  )
}
