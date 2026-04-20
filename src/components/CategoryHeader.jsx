// ARCHIVED — replaced by BottomNav in UX overhaul. Do not import.
// CategoryHeader.jsx — Fixed top strip in map view.
// Left:   home grid icon (returns to module dashboard).
// Centre: Map / Learn / Mine pill tabs.
// Right:  Go & Track button (stopwatch / pulsing red dot while active).
//
// onStartTracking is passed from Map.jsx (wraps useTracks.startTracking).
// isPro/isGuest gate is enforced here — free users see UpgradeSheet.
import useModuleStore from '../store/moduleStore'
import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'
import { getModule } from '../lib/moduleConfig'

const SURFACES = [
  { id: 'map',   label: 'Map' },
  { id: 'learn', label: 'Learn' },
  { id: 'mine',  label: 'Mine' },
]

function pillStyle(active, accentColor) {
  return {
    padding: '5px 16px',
    borderRadius: 20,
    border: `1px solid ${active ? accentColor : 'var(--color-border)'}`,
    background: active ? `${accentColor}22` : 'transparent',
    color: active ? accentColor : 'var(--color-muted)',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
    transition: 'all 120ms ease',
    whiteSpace: 'nowrap',
  }
}

export default function CategoryHeader({ onHome, onStartTracking }) {
  const { activeModule, activeSurface, setActiveSurface } = useModuleStore()
  const module = getModule(activeModule)
  const { isTracking } = useMapStore()
  const { isPro, isGuest, setShowUpgradeSheet } = useUserStore()

  const accent = module?.accent ?? '#E8C96A'

  function handleTrackPress() {
    if (!isPro || isGuest) {
      setShowUpgradeSheet(true)
    } else {
      onStartTracking?.()
    }
  }

  // TODO: move Find trigger to CornerControls

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: 'var(--color-void)',
        borderBottom: '1px solid var(--color-border)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div
        style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Home button — left */}
        <button
          id="tour-home-btn"
          onClick={onHome}
          aria-label="Back to module dashboard"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-muted)',
            padding: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>

        {/* Three-pill surface tabs — centre */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingLeft: 52,
            paddingRight: 52,
          }}
        >
          {SURFACES.map((s) => (
            <button
              key={s.id}
              id={s.id === 'learn' ? 'tour-learn-tab' : s.id === 'mine' ? 'tour-mine-tab' : undefined}
              onClick={() => setActiveSurface(s.id)}
              style={pillStyle(activeSurface === s.id, accent)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Go & Track button — right */}
        <button
          onClick={handleTrackPress}
          aria-label={isTracking ? 'Tracking active' : 'Go & Track'}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            cursor: isTracking ? 'default' : 'pointer',
            padding: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isTracking ? (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#E84B4B',
                animation: 'trackingPulse 1.2s ease-in-out infinite',
              }}
            />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="11" r="5.5" stroke="var(--color-muted)" strokeWidth="1.5"/>
              <path d="M7 1.5h4" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 1.5v3" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 11V8.5" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 11l2 1.2" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
