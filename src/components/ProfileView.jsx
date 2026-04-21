import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'
import { useFindsLog } from '../hooks/useFindsLog'
import { useWaypoints } from '../hooks/useWaypoints'

// ── Helpers ────────────────────────────────────────────────────────

function timeAgo(isoDate) {
  if (!isoDate) return ''
  const secs = Math.floor((Date.now() - new Date(isoDate)) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 2592000) return `${Math.floor(secs / 86400)}d ago`
  return new Date(isoDate).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
}

function fmtDuration(secs) {
  if (!secs) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

// ── Icons ──────────────────────────────────────────────────────────

function PersonIcon({ size = 32, color = 'var(--color-muted)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="11" r="5.5" stroke={color} strokeWidth="1.8"/>
      <path d="M4 28c0-5.523 5.373-10 12-10s12 4.477 12 10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function StarIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1l1.3 2.8L10 4.3l-2 1.9.5 2.8L6 7.7 3.5 9l.5-2.8-2-1.9 2.7-.5L6 1z"
        stroke="var(--color-accent)" strokeWidth="1" strokeLinejoin="round" fill="rgba(232,201,106,0.4)"/>
    </svg>
  )
}

function GemIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 5l2-3h6l2 3-5 8-5-8z" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(232,201,106,0.15)"/>
      <path d="M3 5h10M5.5 5L8 2.5 10.5 5M6 5l2 4 2-4" stroke="var(--color-accent)" strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  )
}

function StopwatchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="9.5" r="5" stroke="var(--color-accent)" strokeWidth="1.3"/>
      <path d="M6 1.5h4" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 1.5v2" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 9.5V7.5" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 9.5l1.5.9" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function MapPinIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.485-2.015-4.5-4.5-4.5z" stroke="var(--color-accent)" strokeWidth="1.3" fill="rgba(232,201,106,0.15)"/>
      <circle cx="8" cy="6" r="1.5" fill="var(--color-accent)"/>
    </svg>
  )
}

function LockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="9" width="12" height="9" rx="2" stroke="var(--color-muted)" strokeWidth="1.4"/>
      <path d="M7 9V7a3 3 0 0 1 6 0v2" stroke="var(--color-muted)" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="10" cy="14" r="1.2" fill="var(--color-muted)"/>
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3l4 4-4 4" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{ padding: '0 16px', marginBottom: 8, fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </div>
  )
}

function SectionCard({ children }) {
  return (
    <div style={{ margin: '0 16px 20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
      {children}
    </div>
  )
}

function IconCircle({ children }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(232,201,106,0.14)', border: '1px solid rgba(232,201,106,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {children}
    </div>
  )
}

function ViewAllRow({ count, label, onPress }) {
  return (
    <button onClick={onPress} style={{ width: '100%', display: 'block', background: 'none', border: 'none', borderTop: '1px solid var(--color-border)', padding: '13px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', textAlign: 'center', WebkitTapHighlightColor: 'transparent' }}>
      View all {count} {label} →
    </button>
  )
}

function EmptyRow({ message }) {
  return (
    <div style={{ padding: '18px 16px', textAlign: 'center', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
      {message}
    </div>
  )
}

function DataRow({ icon, title, subtitle, right, onPress, noBorder }) {
  const inner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: noBorder ? 'none' : '1px solid var(--color-border)' }}>
      <IconCircle>{icon}</IconCircle>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
  if (onPress) {
    return (
      <button onClick={onPress} style={{ display: 'block', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
        {inner}
      </button>
    )
  }
  return inner
}

// ── Guest locked profile ───────────────────────────────────────────

function GuestProfile({ onSignIn, onRegister }) {
  const LOCKED_FIELDS = [
    { label: 'Display Name', placeholder: 'Your name' },
    { label: 'Email', placeholder: 'your@email.com' },
    { label: 'Location', placeholder: 'County, Ireland' },
  ]

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: 'var(--color-base)', paddingBottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 16px)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-surface)', borderRadius: '0 0 20px 20px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
        paddingBottom: 24, paddingLeft: 16, paddingRight: 16,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 20,
      }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-raised)', border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4, opacity: 0.5 }}>
          <PersonIcon size={36} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-muted)' }}>Guest</div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.4 }}>
          Create a free account to unlock your profile
        </div>
      </div>

      {/* Locked fields */}
      <div style={{ margin: '0 16px 20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
        {LOCKED_FIELDS.map((field, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < LOCKED_FIELDS.length - 1 ? '1px solid var(--color-border)' : 'none', opacity: 0.45 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{field.label}</div>
              <div style={{ fontSize: 14, color: 'var(--color-border)' }}>{field.placeholder}</div>
            </div>
            <LockIcon size={18} />
          </div>
        ))}
      </div>

      {/* CTA card */}
      <div style={{ margin: '0 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '20px 18px' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Unlock your profile</div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 20 }}>
          Save waypoints, track sessions, log your finds.
        </div>
        <button
          onClick={onRegister}
          style={{ width: '100%', padding: '13px', background: 'var(--color-accent)', color: '#0A0A0A', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, WebkitTapHighlightColor: 'transparent' }}
        >
          Create Free Account
        </button>
        <button
          onClick={onSignIn}
          style={{ width: '100%', padding: '12px', background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}
        >
          Sign In
        </button>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

export default function ProfileView({ onNavigate }) {
  const { user, isGuest, isPro, setShowAuthModal, setAuthModalDefaultTab, setAuthModalOnSuccess } = useUserStore()
  const { finds } = useFindsLog()
  const { savedWaypoints } = useWaypoints()
  const [tracks, setTracks] = useState([])

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'Prospector'

  useEffect(() => {
    if (!user || isGuest) { setTracks([]); return }
    supabase
      .from('tracks')
      .select('id, name, distance_m, duration_s, started_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) console.error('[ProfileView] tracks fetch:', error.message)
        setTracks(data ?? [])
      })
  }, [user?.id, isGuest]) // eslint-disable-line react-hooks/exhaustive-deps

  // Show guest locked profile
  if (!user || isGuest) {
    function openAuth(tab) {
      setAuthModalDefaultTab(tab)
      setAuthModalOnSuccess(() => () => {}) // no-op; auth state change handles redirect
      setShowAuthModal(true)
    }
    return (
      <GuestProfile
        onRegister={() => openAuth('signup')}
        onSignIn={() => openAuth('signin')}
      />
    )
  }

  const totalDistKm = tracks.reduce((sum, t) => sum + (t.distance_m ?? 0), 0) / 1000
  const distLabel = totalDistKm >= 1 ? `${totalDistKm.toFixed(1)}km` : `${Math.round(totalDistKm * 1000)}m`

  const recentFinds = finds.slice(0, 2)
  const recentTracks = tracks.slice(0, 2)
  const recentWaypoints = savedWaypoints.slice(0, 3)

  return (
    <div style={{
      position: 'absolute', inset: 0, overflowY: 'auto',
      background: 'var(--color-base)', paddingBottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
    }}>
      {/* HEADER CARD */}
      <div style={{
        background: 'var(--color-surface)', borderRadius: '0 0 20px 20px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
        paddingBottom: 24, paddingLeft: 16, paddingRight: 16,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 20,
      }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-raised)', border: '2px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
          <PersonIcon size={36} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center' }}>{displayName}</div>
        {user?.email && <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>{user.email}</div>}
        {isPro ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(232,201,106,0.18)', border: '1px solid rgba(232,201,106,0.5)', borderRadius: 20, padding: '4px 12px', marginTop: 2 }}>
            <StarIcon size={12} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)' }}>Pro Member</span>
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--color-raised)', borderRadius: 20, padding: '4px 12px', marginTop: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-muted)' }}>Free</span>
          </div>
        )}
      </div>

      {/* STATS ROW */}
      <div style={{ display: 'flex', gap: 10, margin: '0 16px 24px' }}>
        {[
          { value: finds.length, label: 'Finds' },
          { value: tracks.length, label: 'Sessions' },
          { value: tracks.length > 0 ? distLabel : '0m', label: 'Distance' },
        ].map(({ value, label }) => (
          <div key={label} style={{ flex: 1, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-accent)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* MY FINDS */}
      <SectionLabel>My Finds</SectionLabel>
      <SectionCard>
        {recentFinds.length === 0 ? (
          <EmptyRow message="No finds recorded yet. Start prospecting to log your first find!" />
        ) : (
          recentFinds.map((find, i) => {
            const loc = find.lat != null ? `${find.lat.toFixed(3)}, ${find.lng.toFixed(3)}` : null
            const sub = [loc, timeAgo(find.found_at)].filter(Boolean).join(' · ')
            return (
              <DataRow key={find.id} icon={<GemIcon />} title={find.title} subtitle={sub} noBorder={i === recentFinds.length - 1 && finds.length <= 2} />
            )
          })
        )}
        {finds.length > 2 && <ViewAllRow count={finds.length} label="finds" onPress={() => {}} />}
      </SectionCard>

      {/* MY SESSIONS */}
      <SectionLabel>My Sessions</SectionLabel>
      <SectionCard>
        {recentTracks.length === 0 ? (
          <EmptyRow message="No sessions yet. Tap Go & Track on the map to start." />
        ) : (
          recentTracks.map((track, i) => {
            const distKm = track.distance_m != null ? (track.distance_m / 1000).toFixed(2) + 'km' : null
            const dur = track.duration_s != null ? fmtDuration(track.duration_s) : null
            const sub = [distKm, dur].filter(Boolean).join(' · ')
            const name = track.name ?? `Session — ${new Date(track.started_at ?? track.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}`
            return (
              <DataRow key={track.id} icon={<StopwatchIcon />} title={name} subtitle={sub} noBorder={i === recentTracks.length - 1 && tracks.length <= 2} />
            )
          })
        )}
        {tracks.length > 2 && <ViewAllRow count={tracks.length} label="sessions" onPress={() => {}} />}
      </SectionCard>

      {/* MY WAYPOINTS */}
      <SectionLabel>My Waypoints</SectionLabel>
      <SectionCard>
        {recentWaypoints.length === 0 ? (
          <EmptyRow message="No waypoints saved. Tap the map to add your first." />
        ) : (
          recentWaypoints.map((wp, i) => {
            const coords = wp.lat != null ? `${Number(wp.lat).toFixed(4)}, ${Number(wp.lng).toFixed(4)}` : null
            return (
              <DataRow key={wp.id} icon={<MapPinIcon />} title={wp.name ?? 'Waypoint'} subtitle={coords} right={<ChevronRight />} onPress={() => onNavigate('map')} noBorder={i === recentWaypoints.length - 1 && savedWaypoints.length <= 3} />
            )
          })
        )}
        {savedWaypoints.length > 3 && <ViewAllRow count={savedWaypoints.length} label="waypoints" onPress={() => onNavigate('map')} />}
      </SectionCard>

      {/* FAVOURITED MINERALS */}
      <SectionLabel>Favourited Minerals</SectionLabel>
      <SectionCard>
        <EmptyRow message="No favourites yet. Tap the ★ on any mineral sheet to save it." />
      </SectionCard>
    </div>
  )
}
