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

function PersonIcon({ size = 32, color = '#6B6F8A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="11" r="5.5" stroke={color} strokeWidth="1.8"/>
      <path d="M4 28c0-5.523 5.373-10 12-10s12 4.477 12 10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function StarIcon({ size = 12, color = '#E8C96A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1l1.3 2.8L10 4.3l-2 1.9.5 2.8L6 7.7 3.5 9l.5-2.8-2-1.9 2.7-.5L6 1z"
        stroke={color} strokeWidth="1" strokeLinejoin="round" fill={`${color}66`}/>
    </svg>
  )
}

function GemIcon({ size = 16, color = '#E8C96A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 5l2-3h6l2 3-5 8-5-8z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" fill={`${color}22`}/>
      <path d="M3 5h10M5.5 5L8 2.5 10.5 5M6 5l2 4 2-4" stroke={color} strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  )
}

function StopwatchIcon({ size = 16, color = '#E8C96A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="9.5" r="5" stroke={color} strokeWidth="1.3"/>
      <path d="M6 1.5h4" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 1.5v2" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 9.5V7.5" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 9.5l1.5.9" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function MapPinIcon({ size = 16, color = '#E8C96A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.485-2.015-4.5-4.5-4.5z"
        stroke={color} strokeWidth="1.3" fill={`${color}22`}/>
      <circle cx="8" cy="6" r="1.5" fill={color}/>
    </svg>
  )
}

function DiamondIcon({ size = 16, color = '#E8C96A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2l5 5-5 7-5-7 5-5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" fill={`${color}22`}/>
    </svg>
  )
}

function ChevronRight({ color = '#6B6F8A' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3l4 4-4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Section label ──────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      padding: '0 16px', marginBottom: 8,
      fontSize: 11, fontWeight: 500, color: '#6B6F8A',
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {children}
    </div>
  )
}

// ── Section card shell ─────────────────────────────────────────────

function SectionCard({ children, style }) {
  return (
    <div style={{
      margin: '0 16px 20px',
      background: '#252840', border: '1px solid #2E3250',
      borderRadius: 14, overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Icon circle ────────────────────────────────────────────────────

function IconCircle({ children }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: 'rgba(232,201,106,0.14)',
      border: '1px solid rgba(232,201,106,0.28)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {children}
    </div>
  )
}

// ── "View all" footer row ──────────────────────────────────────────

function ViewAllRow({ count, label, onPress }) {
  return (
    <button
      onClick={onPress}
      style={{
        width: '100%', display: 'block',
        background: 'none', border: 'none',
        borderTop: '1px solid #2E3250',
        padding: '13px 0', cursor: 'pointer',
        fontSize: 13, fontWeight: 600, color: '#E8C96A', textAlign: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      View all {count} {label} →
    </button>
  )
}

// ── Empty state row ────────────────────────────────────────────────

function EmptyRow({ message }) {
  return (
    <div style={{
      padding: '18px 16px', textAlign: 'center',
      fontSize: 13, color: '#6B6F8A', lineHeight: 1.5,
    }}>
      {message}
    </div>
  )
}

// ── Data row (finds / sessions / waypoints) ────────────────────────

function DataRow({ icon, title, subtitle, right, onPress, noBorder }) {
  const inner = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: noBorder ? 'none' : '1px solid #2E3250',
    }}>
      <IconCircle>{icon}</IconCircle>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: '#E8EAF0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: '#6B6F8A', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )

  if (onPress) {
    return (
      <button onClick={onPress} style={{
        display: 'block', width: '100%', background: 'none', border: 'none',
        cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent',
      }}>
        {inner}
      </button>
    )
  }
  return inner
}

// ── Main component ─────────────────────────────────────────────────

export default function ProfileView({ onNavigate }) {
  const { user, isGuest, isPro } = useUserStore()
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

  const totalDistKm = tracks.reduce((sum, t) => sum + (t.distance_m ?? 0), 0) / 1000
  const distLabel = totalDistKm >= 1 ? `${totalDistKm.toFixed(1)}km` : `${Math.round(totalDistKm * 1000)}m`

  const recentFinds = finds.slice(0, 2)
  const recentTracks = tracks.slice(0, 2)
  const recentWaypoints = savedWaypoints.slice(0, 3)

  return (
    <div style={{
      position: 'absolute', inset: 0, overflowY: 'auto',
      background: '#1A1D2E', paddingBottom: 80,
    }}>

      {/* HEADER CARD */}
      <div style={{
        background: '#252840',
        borderRadius: '0 0 20px 20px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
        paddingBottom: 24, paddingLeft: 16, paddingRight: 16,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        marginBottom: 20,
      }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#3A3D6A', border: '2px solid #E8C96A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 4,
        }}>
          <PersonIcon size={36} color="#6B6F8A" />
        </div>

        {/* Name */}
        <div style={{ fontSize: 20, fontWeight: 700, color: '#E8EAF0', textAlign: 'center' }}>
          {displayName}
        </div>

        {/* Email */}
        {user?.email && (
          <div style={{ fontSize: 14, color: '#6B6F8A' }}>{user.email}</div>
        )}
        {!user && (
          <div style={{ fontSize: 14, color: '#6B6F8A' }}>Guest user</div>
        )}

        {/* Subscription badge */}
        {isPro ? (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(232,201,106,0.18)', border: '1px solid rgba(232,201,106,0.5)',
            borderRadius: 20, padding: '4px 12px', marginTop: 2,
          }}>
            <StarIcon size={12} color="#E8C96A" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#E8C96A' }}>Pro Member</span>
          </div>
        ) : (
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            background: '#2E3250', borderRadius: 20, padding: '4px 12px', marginTop: 2,
          }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#6B6F8A' }}>Free</span>
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
          <div key={label} style={{
            flex: 1, background: '#252840', border: '1px solid #2E3250',
            borderRadius: 12, padding: 14, textAlign: 'center',
          }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#E8C96A', lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: '#6B6F8A', marginTop: 4 }}>{label}</div>
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
              <DataRow
                key={find.id}
                icon={<GemIcon />}
                title={find.title}
                subtitle={sub}
                noBorder={i === recentFinds.length - 1 && finds.length <= 2}
              />
            )
          })
        )}
        {finds.length > 2 && (
          <ViewAllRow count={finds.length} label="finds" onPress={() => {}} />
        )}
      </SectionCard>

      {/* MY SESSIONS */}
      <SectionLabel>My Sessions</SectionLabel>
      <SectionCard>
        {recentTracks.length === 0 ? (
          <EmptyRow message="No sessions yet. Tap Go & Track on the map to start." />
        ) : (
          recentTracks.map((track, i) => {
            const distKm = track.distance_m != null
              ? (track.distance_m / 1000).toFixed(2) + 'km'
              : null
            const dur = track.duration_s != null ? fmtDuration(track.duration_s) : null
            const sub = [distKm, dur].filter(Boolean).join(' · ')
            const name = track.name ?? `Session — ${new Date(track.started_at ?? track.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}`
            return (
              <DataRow
                key={track.id}
                icon={<StopwatchIcon />}
                title={name}
                subtitle={sub}
                noBorder={i === recentTracks.length - 1 && tracks.length <= 2}
              />
            )
          })
        )}
        {tracks.length > 2 && (
          <ViewAllRow count={tracks.length} label="sessions" onPress={() => {}} />
        )}
      </SectionCard>

      {/* MY WAYPOINTS */}
      <SectionLabel>My Waypoints</SectionLabel>
      <SectionCard>
        {recentWaypoints.length === 0 ? (
          <EmptyRow message="No waypoints saved. Tap the map to add your first." />
        ) : (
          recentWaypoints.map((wp, i) => {
            const coords = wp.lat != null
              ? `${Number(wp.lat).toFixed(4)}, ${Number(wp.lng).toFixed(4)}`
              : null
            return (
              <DataRow
                key={wp.id}
                icon={<MapPinIcon />}
                title={wp.name ?? 'Waypoint'}
                subtitle={coords}
                right={<ChevronRight />}
                onPress={() => onNavigate('map')}
                noBorder={i === recentWaypoints.length - 1 && savedWaypoints.length <= 3}
              />
            )
          })
        )}
        {savedWaypoints.length > 3 && (
          <ViewAllRow count={savedWaypoints.length} label="waypoints" onPress={() => onNavigate('map')} />
        )}
      </SectionCard>

      {/* FAVOURITED MINERALS */}
      <SectionLabel>Favourited Minerals</SectionLabel>
      <SectionCard>
        <EmptyRow message="No favourites yet. Tap the ★ on any mineral sheet to save it." />
      </SectionCard>

    </div>
  )
}
