// CategoryHeader.jsx — Fixed top strip in map view.
// Left:   home grid icon (returns to module dashboard).
// Centre: active module name + accent dot.
// Right:  Find button (prospecting only) + Go & Track button.
//         Find: opens FindSheet (free for gold t6/t7, Pro for rest).
//         Track: Pro gate; pulsing red dot when active.
//
// onStartTracking is passed from Map.jsx (wraps useTracks.startTracking).
// isPro/isGuest gate is enforced here — free users see UpgradeSheet.
import useModuleStore from '../store/moduleStore'
import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'
import { getModule } from '../lib/moduleConfig'

export default function CategoryHeader({ onHome, onStartTracking }) {
  const { activeModule } = useModuleStore()
  const module = getModule(activeModule)
  const { isTracking, setFindSheetOpen } = useMapStore()
  const { isPro, isGuest, setShowUpgradeSheet } = useUserStore()

  function handleTrackPress() {
    if (!isPro || isGuest) {
      setShowUpgradeSheet(true)
    } else {
      onStartTracking?.()
    }
  }

  function handleFindPress() {
    setFindSheetOpen(true)
  }

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
          {/* 2×2 grid icon */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>

        {/* Module name — centred */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
          }}
        >
          {module && (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: module.accent,
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-primary)',
              letterSpacing: '0.01em',
            }}
          >
            {module?.label ?? 'Explore Eire'}
          </span>
        </div>

        {/* Find nearby button — prospecting only, right of centre */}
        {activeModule === 'prospecting' && (
          <button
            onClick={handleFindPress}
            aria-label="Find nearby"
            style={{
              position: 'absolute',
              right: 52,
              top: 0,
              bottom: 0,
              width: 44,
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
            {/* Search / crosshair icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}

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
            /* Pulsing red dot while active */
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
            /* Stopwatch icon */
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
