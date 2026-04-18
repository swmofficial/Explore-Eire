// MineSurface.jsx — Personal history surface for each module.
// Renders above the map when activeSurface === 'mine'.
// Three sections: My Waypoints, My Tracks, My Finds Log.
import { useState, useEffect } from 'react'
import useModuleStore from '../store/moduleStore'
import useUserStore from '../store/userStore'
import { useWaypoints } from '../hooks/useWaypoints'
import { supabase } from '../lib/supabase'

// ── Section heading ────────────────────────────────────────────────

function SectionHeading({ label }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--color-muted)',
      padding: '20px 16px 8px',
    }}>
      {label}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 16px', color: 'var(--color-muted)', fontSize: 13 }}>
      {message}
    </div>
  )
}

// ── Trash icon ─────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M6 7v5M10 7v5M3 4l1 9.5a.5.5 0 00.5.5h7a.5.5 0 00.5-.5L13 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Waypoint row ───────────────────────────────────────────────────

function WaypointRow({ waypoint, onDelete }) {
  const icon = waypoint.icon === 'fish' ? '🎣'
    : waypoint.icon === 'camp' ? '⛺'
    : waypoint.icon === 'hazard' ? '⚠️'
    : waypoint.icon === 'note' ? '📝'
    : waypoint.icon === 'custom' ? '⭐'
    : '📍'

  const lat = waypoint.lat != null ? waypoint.lat.toFixed(4) : '—'
  const lng = waypoint.lng != null ? waypoint.lng.toFixed(4) : '—'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px 16px',
      borderBottom: '1px solid var(--color-border)',
      gap: 12,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {waypoint.name ?? 'Unnamed waypoint'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
          {lat}, {lng}
        </div>
      </div>
      <button
        onClick={() => onDelete(waypoint.id)}
        aria-label="Delete waypoint"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-danger)',
          padding: 6,
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <TrashIcon />
      </button>
    </div>
  )
}

// ── Track row ──────────────────────────────────────────────────────

function TrackRow({ track }) {
  const distKm = track.distance_m != null ? (track.distance_m / 1000).toFixed(2) + ' km' : '—'
  const dur = track.duration_s != null
    ? `${Math.floor(track.duration_s / 3600)}h ${Math.floor((track.duration_s % 3600) / 60)}m`
    : '—'
  const name = track.name ?? new Date(track.started_at ?? track.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px 16px',
      borderBottom: '1px solid var(--color-border)',
      gap: 12,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>🗺</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
          {distKm} · {dur}
        </div>
      </div>
    </div>
  )
}

// ── Finds Log empty state ──────────────────────────────────────────

function FindsLogEmpty() {
  return (
    <div style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>📷</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 6 }}>
        Your finds log is empty
      </div>
      <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-muted)', lineHeight: 1.5 }}>
        Tap the camera button on{'\n'}the map to log a find.
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

export default function MineSurface() {
  const { activeSurface } = useModuleStore()
  const { user, isGuest } = useUserStore()
  const { savedWaypoints, deleteWaypoint } = useWaypoints()
  const [tracks, setTracks] = useState([])

  useEffect(() => {
    if (!user || isGuest || activeSurface !== 'mine') return
    supabase
      .from('tracks')
      .select('id, name, distance_m, duration_s, started_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setTracks(data ?? []))
  }, [user?.id, isGuest, activeSurface]) // eslint-disable-line react-hooks/exhaustive-deps

  if (activeSurface !== 'mine') return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-base)',
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 44px)',
          overflowY: 'auto',
          flex: 1,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* My Waypoints */}
        <SectionHeading label="My Waypoints" />
        {savedWaypoints.length === 0 ? (
          <EmptyState message="No waypoints saved yet" />
        ) : (
          savedWaypoints.map((wp) => (
            <WaypointRow key={wp.id} waypoint={wp} onDelete={deleteWaypoint} />
          ))
        )}

        {/* My Tracks */}
        <SectionHeading label="My Tracks" />
        {tracks.length === 0 ? (
          <EmptyState message="No tracks recorded yet" />
        ) : (
          tracks.map((t) => (
            <TrackRow key={t.id} track={t} />
          ))
        )}

        {/* My Finds Log */}
        <SectionHeading label="My Finds Log" />
        <FindsLogEmpty />

        <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }} />
      </div>
    </div>
  )
}
