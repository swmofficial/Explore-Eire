// WaypointSheet.jsx — Add and view persisted waypoints.
// Opened from:
//   - CornerControls camera button (Pro)  → mode: 'add'
//   - Map tap on a saved-waypoints-circles → mode: 'view'
// GPS coords come from navigator.geolocation ONLY — never EXIF.
import { useState, useEffect } from 'react'
import useMapStore from '../store/mapStore'
import { useGeolocation } from '../hooks/useGeolocation'

// ── Icon options ───────────────────────────────────────────────────
const ICONS = [
  { id: 'prospect', emoji: '📍', label: 'Prospect' },
  { id: 'fish',     emoji: '🎣', label: 'Fish' },
  { id: 'camp',     emoji: '⛺', label: 'Camp' },
  { id: 'hazard',   emoji: '⚠️', label: 'Hazard' },
  { id: 'note',     emoji: '📝', label: 'Note' },
  { id: 'custom',   emoji: '⭐', label: 'Custom' },
]

function iconEmoji(id) {
  return ICONS.find((i) => i.id === id)?.emoji ?? '📍'
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IE', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch {
    return iso
  }
}

// ── Shared primitives ──────────────────────────────────────────────
const SHEET_STYLE = {
  position: 'fixed',
  bottom: 0, left: 0, right: 0,
  zIndex: 42,
  background: 'var(--color-surface)',
  borderTop: '1px solid var(--color-border)',
  borderRadius: '16px 16px 0 0',
  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
  animation: 'slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)',
  maxHeight: '85vh',
  overflowY: 'auto',
}

const BACKDROP_STYLE = {
  position: 'fixed', inset: 0, zIndex: 41,
  background: 'rgba(0,0,0,0.5)',
  animation: 'backdropFadeIn 200ms ease-out',
}

function Handle() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
      <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--color-border)' }} />
    </div>
  )
}

function CloseBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-muted)', padding: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, WebkitTapHighlightColor: 'transparent', flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  )
}

const LABEL_STYLE = {
  fontSize: 11, fontWeight: 500,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: 'var(--color-muted)', display: 'block', marginBottom: 6,
}

const INPUT_STYLE = {
  width: '100%',
  background: 'var(--color-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 8, padding: '12px',
  fontSize: 14, color: 'var(--color-primary)',
  outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
}

// ── Add mode ───────────────────────────────────────────────────────
function AddMode({ onClose, addWaypoint }) {
  const { getCurrentPosition } = useGeolocation()
  const [coords, setCoords]     = useState(null)
  const [gpsLoading, setGpsLoading] = useState(true)
  const [name, setName]         = useState('')
  const [icon, setIcon]         = useState('prospect')
  const [saving, setSaving]     = useState(false)

  // One-shot GPS read when sheet opens
  useEffect(() => {
    let cancelled = false
    getCurrentPosition()
      .then((pos) => {
        if (cancelled) return
        setCoords(pos.coords)
        setGpsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setGpsLoading(false)
      })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!coords) return
    setSaving(true)
    await addWaypoint({
      name: name.trim() || 'Waypoint',
      lat: coords.latitude,
      lng: coords.longitude,
      icon,
      created_at: new Date().toISOString(),
    })
    setSaving(false)
    onClose()
  }

  const canSave = !!coords && !saving

  return (
    <>
      <div onClick={onClose} style={BACKDROP_STYLE} />
      <div style={SHEET_STYLE}>
        <Handle />
        <div style={{ padding: '0 20px' }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
              New Waypoint
            </h2>
            <CloseBtn onClick={onClose} />
          </div>

          {/* GPS coords */}
          <div style={{
            padding: '10px 12px',
            background: 'var(--color-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 8, marginBottom: 16,
          }}>
            <span style={LABEL_STYLE}>Location</span>
            {gpsLoading && (
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>Acquiring GPS…</div>
            )}
            {!gpsLoading && coords && (
              <div style={{ fontSize: 12, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
              </div>
            )}
            {!gpsLoading && !coords && (
              <div style={{ fontSize: 12, color: '#E84B4B' }}>GPS unavailable</div>
            )}
          </div>

          {/* Name input */}
          <div style={{ marginBottom: 16 }}>
            <label style={LABEL_STYLE}>Name</label>
            <input
              type="text"
              placeholder="Waypoint name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              style={INPUT_STYLE}
            />
          </div>

          {/* Icon picker */}
          <div style={{ marginBottom: 24 }}>
            <span style={LABEL_STYLE}>Type</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ICONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setIcon(opt.id)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4,
                    padding: '8px 10px',
                    background: 'var(--color-raised)',
                    border: icon === opt.id
                      ? '1.5px solid #E8C96A'
                      : '1px solid var(--color-border)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'border-color 120ms ease',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{opt.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.04em' }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              width: '100%', height: 48,
              background: canSave ? '#E8C96A' : 'rgba(232,201,106,0.35)',
              color: '#0A0A0A', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 600,
              cursor: canSave ? 'pointer' : 'not-allowed',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background 150ms ease',
            }}
          >
            {saving ? 'Saving…' : 'Save Waypoint'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── View mode ──────────────────────────────────────────────────────
function ViewMode({ waypoint, onClose, deleteWaypoint }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deleteWaypoint(waypoint.id)
    setDeleting(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ ...BACKDROP_STYLE, background: 'rgba(0,0,0,0.4)' }} />
      <div style={SHEET_STYLE}>
        <Handle />
        <div style={{ padding: '0 20px' }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 2 }}>
              <span style={{ fontSize: 22 }}>{iconEmoji(waypoint.icon)}</span>
              <h2 style={{
                fontSize: 18, fontWeight: 600,
                color: 'var(--color-primary)', margin: 0, wordBreak: 'break-word',
              }}>
                {waypoint.name || 'Waypoint'}
              </h2>
            </div>
            <CloseBtn onClick={onClose} />
          </div>

          {/* Location */}
          <div style={{
            padding: '10px 12px',
            background: 'var(--color-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 8, marginBottom: 10,
          }}>
            <span style={LABEL_STYLE}>Location</span>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {Number(waypoint.lat).toFixed(6)}, {Number(waypoint.lng).toFixed(6)}
            </div>
          </div>

          {/* Created */}
          <div style={{
            padding: '10px 12px',
            background: 'var(--color-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: 8, marginBottom: 24,
          }}>
            <span style={LABEL_STYLE}>Saved</span>
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              {formatDate(waypoint.created_at)}
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              width: '100%', height: 48,
              background: 'transparent',
              color: deleting ? 'var(--color-muted)' : '#E84B4B',
              border: `1px solid ${deleting ? 'var(--color-border)' : '#E84B4B'}`,
              borderRadius: 12, fontSize: 14, fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
              WebkitTapHighlightColor: 'transparent',
              transition: 'opacity 150ms ease',
            }}
          >
            {deleting ? 'Deleting…' : 'Delete Waypoint'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Root ───────────────────────────────────────────────────────────
export default function WaypointSheet({ addWaypoint, deleteWaypoint }) {
  const { waypointSheet, setWaypointSheet } = useMapStore()

  if (!waypointSheet) return null

  function handleClose() {
    setWaypointSheet(null)
  }

  if (waypointSheet.mode === 'add') {
    return <AddMode onClose={handleClose} addWaypoint={addWaypoint} />
  }

  if (waypointSheet.mode === 'view' && waypointSheet.waypoint) {
    return (
      <ViewMode
        waypoint={waypointSheet.waypoint}
        onClose={handleClose}
        deleteWaypoint={deleteWaypoint}
      />
    )
  }

  return null
}
