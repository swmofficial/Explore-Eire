import useUserStore from '../store/userStore'
import { useWaypoints } from '../hooks/useWaypoints'
import { useFindsLog } from '../hooks/useFindsLog'
import { useCourseSummary } from '../hooks/useLearn'
import { useTracks } from '../hooks/useTracks'

// ── Icon helpers ───────────────────────────────────────────────────

function PickaxeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 12L6 8" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5.5 8.5L10 2" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 2L12 4" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8.5 3.5L5 7" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function PersonIcon({ size = 18, color = 'var(--color-accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="6" r="3.2" stroke={color} strokeWidth="1.5"/>
      <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function CompassIcon({ size = 18, color = 'var(--color-accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke={color} strokeWidth="1.5"/>
      <path d="M11.5 6.5L10 10l-3.5 1.5L8 8l3.5-1.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  )
}

function ChevronRight({ color = 'var(--color-accent)' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3l4 4-4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function BookIcon({ size = 18, color = 'var(--color-accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 3h5a2.5 2.5 0 0 1 2.5 2.5V15a1.5 1.5 0 0 0-1.5-1.5H3V3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M15 3h-5a2.5 2.5 0 0 0-2.5 2.5V15a1.5 1.5 0 0 1 1.5-1.5H15V3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

function MapPinIcon({ size = 18, color = 'var(--color-accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2C6.24 2 4 4.24 4 7c0 3.94 5 9 5 9s5-5.06 5-9c0-2.76-2.24-5-5-5z" stroke={color} strokeWidth="1.5" fill={`${color}22`}/>
      <circle cx="9" cy="7" r="2" fill={color}/>
    </svg>
  )
}

function SearchIcon({ size = 18, color = 'var(--color-accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5" stroke={color} strokeWidth="1.5"/>
      <path d="M12 12l3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// ── Gold circle icon wrapper ───────────────────────────────────────

function GoldCircle({ children }) {
  return (
    <div style={{
      width: 38,
      height: 38,
      borderRadius: '50%',
      background: 'rgba(232,201,106,0.14)',
      border: '1px solid rgba(232,201,106,0.28)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {children}
    </div>
  )
}

// ── Activity card ──────────────────────────────────────────────────

function ActivityCard({ icon, title, subtitle, right, onPress }) {
  return (
    <button
      onClick={onPress}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 10,
        cursor: 'pointer',
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <GoldCircle>{icon}</GoldCircle>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {right}
      </div>
    </button>
  )
}

// ── Stat number ────────────────────────────────────────────────────

function StatNumber({ value }) {
  return (
    <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-accent)' }}>
      {value}
    </span>
  )
}

// ── Progress bar ───────────────────────────────────────────────────

function ProgressBar({ percent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <div style={{
        width: 60,
        height: 5,
        borderRadius: 3,
        background: 'var(--color-raised)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          background: 'var(--color-accent)',
          borderRadius: 3,
        }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{percent}% complete</span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

export default function DashboardView({ onNavigate }) {
  const { user } = useUserStore()
  const { savedWaypoints } = useWaypoints()
  const { finds } = useFindsLog()
  const { inProgressCount, overallPercent } = useCourseSummary()
  const { savedTrackCount } = useTracks()

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : null) ||
    'Prospector'

  const waypointCount = savedWaypoints.length
  const findsCount = finds.length

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflowY: 'auto',
      background: 'var(--color-base)',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
      paddingBottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
      paddingLeft: 16,
      paddingRight: 16,
    }}>

      {/* SECTION 1 — Greeting card */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 10,
        }}>
          <PickaxeIcon />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', letterSpacing: '0.01em' }}>
            Ireland's Prospecting Companion
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
          Hi {displayName},
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>
          Welcome back to Explore Éire
        </div>
      </div>

      {/* SECTION 2 — Two half-width cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {/* My Account */}
        <button
          onClick={() => onNavigate('profile')}
          style={{
            flex: 1,
            background: 'var(--color-card-alt)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: 16,
            cursor: 'pointer',
            textAlign: 'left',
            position: 'relative',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <PersonIcon />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3 }}>
            My Account
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
            View your profile
          </div>
          <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
            <ChevronRight />
          </div>
        </button>

        {/* Explore Features */}
        <button
          onClick={() => onNavigate('learn')}
          style={{
            flex: 1,
            background: 'var(--color-card-alt)',
            border: '1px solid var(--color-border)',
            borderRadius: 14,
            padding: 16,
            cursor: 'pointer',
            textAlign: 'left',
            position: 'relative',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <CompassIcon />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3 }}>
            Explore Features
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
            Discover the app
          </div>
          <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
            <ChevronRight />
          </div>
        </button>
      </div>

      {/* SECTION 3 — Divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--color-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          Your Activity
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
      </div>

      {/* SECTION 4 — Activity cards */}

      {/* Card 1 — My Courses */}
      <ActivityCard
        icon={<BookIcon />}
        title="My Courses"
        subtitle={
          inProgressCount > 0
            ? `${inProgressCount} course${inProgressCount === 1 ? '' : 's'} in progress`
            : 'No courses started yet'
        }
        right={<ProgressBar percent={overallPercent} />}
        onPress={() => onNavigate('learn')}
      />

      {/* Card 2 — My Waypoints */}
      <ActivityCard
        icon={<MapPinIcon />}
        title="My Waypoints"
        subtitle={
          waypointCount > 0
            ? `${waypointCount} waypoint${waypointCount === 1 ? '' : 's'} saved`
            : 'No waypoints yet — add one on the map'
        }
        right={waypointCount > 0 ? <StatNumber value={waypointCount} /> : null}
        onPress={() => onNavigate('map')}
      />

      {/* Card 3 — Field Log */}
      <ActivityCard
        icon={<SearchIcon />}
        title="Field Log"
        subtitle={
          findsCount > 0
            ? `${findsCount} find${findsCount === 1 ? '' : 's'} recorded`
            : 'No finds recorded yet'
        }
        right={findsCount > 0 ? <StatNumber value={findsCount} /> : null}
        onPress={() => onNavigate('profile')}
      />

      {/* Card 4 — My Sessions */}
      <ActivityCard
        icon={<CompassIcon />}
        title="My Sessions"
        subtitle={
          savedTrackCount > 0
            ? `${savedTrackCount} session${savedTrackCount === 1 ? '' : 's'} recorded`
            : 'No sessions yet — tap Go & Track on the map'
        }
        right={savedTrackCount > 0 ? <StatNumber value={savedTrackCount} /> : null}
        onPress={() => onNavigate('profile')}
      />

    </div>
  )
}
