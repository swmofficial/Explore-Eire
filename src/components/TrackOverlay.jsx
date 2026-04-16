// TrackOverlay.jsx — Live GPS tracking UI + completion summary sheet.
//
// Renders in two states:
//   1. While tracking (isTracking=true): floating pill with pulsing red dot,
//      live distance, live duration (mm:ss), and a Stop button.
//   2. After stopping: completion summary sheet with distance, duration, start/end times.
//
// The overlay reads isTracking and sessionTrail directly from mapStore.
// Distance is calculated on every sessionTrail change.
// Duration is driven by a local interval that starts when isTracking becomes true.
//
// onStop prop: async function that calls useTracks.stopTracking() and returns
// { distance, duration, startedAt, endedAt }.
import { useState, useEffect, useRef } from 'react'
import useMapStore from '../store/mapStore'
import { calcTrailDistanceM } from '../hooks/useTracks'

// ── Helpers ──────────────────────────────────────────────────────────

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return '' }
}

function formatDistance(metres) {
  if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`
  return `${Math.round(metres)} m`
}

// ── Stat card (used in completion sheet) ────────────────────────────

function StatCard({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        padding: '14px 16px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--color-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--color-muted)',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────

export default function TrackOverlay({ onStop }) {
  const { isTracking, sessionTrail } = useMapStore()
  const [completedTrack, setCompletedTrack] = useState(null)
  const [duration, setDuration]             = useState(0)
  const [stopping, setStopping]             = useState(false)
  const timerRef    = useRef(null)
  const startMsRef  = useRef(null)

  // Start/stop the duration counter when isTracking toggles
  useEffect(() => {
    if (isTracking) {
      setDuration(0)
      startMsRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startMsRef.current) / 1000))
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isTracking])

  const distanceM = calcTrailDistanceM(sessionTrail)

  async function handleStop() {
    setStopping(true)
    const result = await onStop()
    setStopping(false)
    setCompletedTrack(result)
  }

  // Don't render if not tracking and no completion sheet to show
  if (!isTracking && !completedTrack) return null

  // ── Completion summary sheet ────────────────────────────────────
  if (completedTrack) {
    return (
      <>
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 48,
            background: 'rgba(0,0,0,0.5)',
            animation: 'backdropFadeIn 200ms ease-out',
          }}
        />
        <div
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 49,
            background: 'var(--color-base)',
            borderTop: '1px solid var(--color-border)',
            borderRadius: '16px 16px 0 0',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
            animation: 'slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {/* Handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--color-border)' }} />
          </div>

          <div style={{ padding: '0 20px' }}>
            {/* Header */}
            <div
              style={{
                display: 'flex', alignItems: 'flex-start',
                justifyContent: 'space-between', marginBottom: 20,
              }}
            >
              <div>
                <h2
                  style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-primary)', margin: '0 0 4px' }}
                >
                  Track Complete
                </h2>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                  {formatDate(completedTrack.startedAt)}
                  {' · '}
                  {formatTime(completedTrack.startedAt)}
                  {' → '}
                  {formatTime(completedTrack.endedAt)}
                </div>
              </div>
              <button
                onClick={() => setCompletedTrack(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-muted)', padding: 6, borderRadius: 6,
                  WebkitTapHighlightColor: 'transparent', flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <StatCard label="Distance" value={formatDistance(completedTrack.distance)} />
              <StatCard label="Duration" value={formatDuration(completedTrack.duration)} />
            </div>

            {/* Done button */}
            <button
              onClick={() => setCompletedTrack(null)}
              style={{
                width: '100%', height: 48,
                background: '#E8C96A', color: '#0A0A0A',
                border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 600,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Live tracking pill ──────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 44px + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        background: 'rgba(10,10,10,0.92)',
        border: '1px solid rgba(232,75,75,0.4)',
        borderRadius: 24,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      {/* Pulsing red dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#E84B4B',
          flexShrink: 0,
          animation: 'trackingPulse 1.2s ease-in-out infinite',
        }}
      />

      {/* Live distance */}
      <span
        style={{
          fontSize: 13, fontWeight: 600,
          color: 'var(--color-primary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatDistance(distanceM)}
      </span>

      {/* Divider */}
      <div style={{ width: 1, height: 14, background: 'var(--color-border)', flexShrink: 0 }} />

      {/* Duration */}
      <span
        style={{
          fontSize: 13, fontWeight: 500,
          color: 'var(--color-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatDuration(duration)}
      </span>

      {/* Stop button */}
      <button
        onClick={handleStop}
        disabled={stopping}
        style={{
          marginLeft: 2,
          padding: '4px 12px',
          background: 'rgba(232,75,75,0.15)',
          border: '1px solid rgba(232,75,75,0.45)',
          borderRadius: 14,
          color: '#E84B4B',
          fontSize: 12,
          fontWeight: 600,
          cursor: stopping ? 'not-allowed' : 'pointer',
          WebkitTapHighlightColor: 'transparent',
          flexShrink: 0,
          opacity: stopping ? 0.6 : 1,
        }}
      >
        {stopping ? 'Saving…' : 'Stop'}
      </button>
    </div>
  )
}
