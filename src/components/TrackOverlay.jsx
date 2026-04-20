// TrackOverlay.jsx — Full-screen GPS tracking overlay.
//
// While tracking (isTracking=true):
//   - Map remains fully visible + interactive underneath (pointer-events: none on wrapper)
//   - Top bar: accent dot + "Tracking" + pulsing REC dot + elapsed time
//   - Bottom panel (220px): 4 stat cells + mini elevation graph + Stop button
//
// After stopping (showSummary=true):
//   - Summary overlay: distance, duration, elevation gain/loss, avg pace
//   - Save Track (→ Supabase) + Discard buttons
//
// Trail on map is gold dotted polyline — handled in Map.jsx addDataLayers.
// Elevation values are fetched from MapTiler terrain tiles by useTracks.
import { useState, useEffect, useRef } from 'react'
import useMapStore from '../store/mapStore'
import useModuleStore from '../store/moduleStore'
import { calcTrailDistanceM } from '../hooks/useTracks'
import { getModule } from '../lib/moduleConfig'
import { triggerHaptic } from '../lib/haptics'

// ── Formatters ──────────────────────────────────────────────────────

function formatMmSs(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDist(metres) {
  if (metres >= 1000) return `${(metres / 1000).toFixed(2)} km`
  return `${Math.round(metres)} m`
}

function formatPace(secPerKm) {
  if (!secPerKm || !isFinite(secPerKm)) return '—'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

function formatElev(metres) {
  return `${metres >= 0 ? '+' : ''}${metres} m`
}

// ── Mini elevation graph ─────────────────────────────────────────────

function ElevGraph({ profile }) {
  const pts = profile.slice(-20)
  if (pts.length < 2) {
    return (
      <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>No elevation data yet</span>
      </div>
    )
  }
  const elevs = pts.map((p) => p.elevation)
  const minE = Math.min(...elevs)
  const maxE = Math.max(...elevs)
  const range = maxE - minE || 1
  const W = 300
  const H = 36
  const coords = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * W
      const y = H - ((p.elevation - minE) / range) * (H - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <polyline
        points={coords}
        fill="none"
        stroke="#E8C96A"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ── Stat cell ────────────────────────────────────────────────────────

function StatCell({ label, value }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '0 4px' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────

export default function TrackOverlay({ onStop, onSave }) {
  const { isTracking, sessionTrail, elevationProfile } = useMapStore()
  const { activeModule } = useModuleStore()
  const module = getModule(activeModule)

  const [duration, setDuration]         = useState(0)
  const [stopping, setStopping]         = useState(false)
  const [saving, setSaving]             = useState(false)
  const [summary, setSummary]           = useState(null) // null = live tracking; object = summary view
  const timerRef   = useRef(null)
  const startMsRef = useRef(null)

  // Duration timer
  useEffect(() => {
    if (isTracking) {
      setDuration(0)
      startMsRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startMsRef.current) / 1000))
      }, 1000)
    }
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }, [isTracking])

  const distanceM = calcTrailDistanceM(sessionTrail)
  // Current elevation — last point in profile
  const currentElev = elevationProfile.length > 0
    ? elevationProfile[elevationProfile.length - 1].elevation
    : null
  // Live elevation gain from profile
  let liveGain = 0
  for (let i = 1; i < elevationProfile.length; i++) {
    const d = elevationProfile[i].elevation - elevationProfile[i - 1].elevation
    if (d > 0) liveGain += d
  }

  async function handleStop() {
    setStopping(true)
    const result = onStop()
    triggerHaptic('medium')
    setStopping(false)
    setSummary(result)
  }

  async function handleSave() {
    if (!summary || saving) return
    setSaving(true)
    await onSave(summary)
    setSaving(false)
    setSummary(null)
  }

  function handleDiscard() {
    setSummary(null)
  }

  if (!isTracking && !summary) return null

  // ── Summary view ────────────────────────────────────────────────
  if (summary) {
    const pace = summary.distance > 0 ? summary.avgPaceSecPerKm : 0
    return (
      <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.6)', animation: 'backdropFadeIn 200ms ease-out' }} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              {module && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: module.accent, flexShrink: 0 }} />
              )}
              <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-primary)', margin: 0, flex: 1 }}>
                Track Complete
              </h2>
            </div>

            {/* Stats grid — 2 rows */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>{formatDist(summary.distance)}</div>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>Distance</div>
              </div>
              <div style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatMmSs(summary.duration)}</div>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>Duration</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              <div style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#4BE87A', letterSpacing: '-0.02em' }}>{formatElev(summary.elevationGain)}</div>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>Elev Gain</div>
              </div>
              <div style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>{formatPace(pace)}</div>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>Avg Pace</div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDiscard}
                style={{
                  flex: 1, height: 48,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12, fontSize: 14, fontWeight: 600,
                  color: 'var(--color-muted)', cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 2, height: 48,
                  background: saving ? 'rgba(232,201,106,0.5)' : '#E8C96A',
                  border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  color: '#0A0A0A', cursor: saving ? 'not-allowed' : 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save Track'}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Live tracking overlay ───────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        zIndex: 45,
        pointerEvents: 'none', // map stays interactive
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: 'rgba(10,10,10,0.92)',
          borderBottom: '1px solid rgba(232,75,75,0.25)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          pointerEvents: 'auto',
          zIndex: 1,
        }}
      >
        <div
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '0 16px',
          }}
        >
          {/* Module accent dot */}
          {module && (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: module.accent, flexShrink: 0 }} />
          )}

          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>
            Tracking
          </span>

          {/* REC dot */}
          <div
            style={{
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#E84B4B',
              flexShrink: 0,
              animation: 'trackingPulse 1.2s ease-in-out infinite',
            }}
          />

          {/* Elapsed time */}
          <span
            style={{
              fontSize: 14, fontWeight: 600,
              color: '#E84B4B',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 44,
              textAlign: 'right',
            }}
          >
            {formatMmSs(duration)}
          </span>

          {/* Stop pill — escape hatch */}
          <button
            onClick={handleStop}
            disabled={stopping}
            style={{
              marginLeft: 8,
              background: 'rgba(232,75,75,0.15)',
              border: '1px solid rgba(232,75,75,0.4)',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: '#E84B4B',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              flexShrink: 0,
            }}
          >
            Stop
          </button>
        </div>
      </div>

      {/* Bottom panel — sits above nav bar (64px) */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          left: 0, right: 0,
          background: 'var(--color-base)',
          border: '1px solid rgba(232,201,106,0.25)',
          borderRadius: '16px 16px 0 0',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ padding: '14px 16px 16px' }}>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
            <StatCell label="Distance" value={formatDist(distanceM)} />
            <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0, margin: '0 4px' }} />
            <StatCell label="Duration" value={formatMmSs(duration)} />
            <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0, margin: '0 4px' }} />
            <StatCell label="Elevation" value={currentElev !== null ? `${currentElev} m` : '—'} />
            <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0, margin: '0 4px' }} />
            <StatCell label="Gain" value={liveGain > 0 ? `+${Math.round(liveGain)} m` : '—'} />
          </div>

          {/* Elevation mini-graph */}
          <div style={{ marginBottom: 14, height: 36 }}>
            <ElevGraph profile={elevationProfile} />
          </div>

          {/* Stop button */}
          <button
            onClick={handleStop}
            disabled={stopping}
            style={{
              width: '100%', height: 48,
              background: stopping ? 'rgba(232,75,75,0.4)' : 'rgba(232,75,75,0.15)',
              border: '1px solid rgba(232,75,75,0.5)',
              borderRadius: 12,
              color: '#E84B4B',
              fontSize: 15, fontWeight: 700,
              cursor: stopping ? 'not-allowed' : 'pointer',
              WebkitTapHighlightColor: 'transparent',
              opacity: stopping ? 0.7 : 1,
              letterSpacing: '0.02em',
            }}
          >
            {stopping ? 'Stopping…' : 'Stop'}
          </button>
        </div>
      </div>
    </div>
  )
}
