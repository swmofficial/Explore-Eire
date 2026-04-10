// CategoryHeader.jsx — Fixed top strip in map view.
// Left: home grid icon (returns to module dashboard).
// Centre: active module name.
// No tabs — data navigation moved to DataSheet bottom sheet.
import useModuleStore from '../store/moduleStore'
import { getModule } from '../lib/moduleConfig'

export default function CategoryHeader({ onHome }) {
  const { activeModule } = useModuleStore()
  const module = getModule(activeModule)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        background: '#0A0A0A',
        borderBottom: '1px solid #2E3035',
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
        {/* Home button — grid icon, left */}
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
            color: '#6B7280',
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
              color: '#E8EAF0',
              letterSpacing: '0.01em',
            }}
          >
            {module?.label ?? 'Explore Eire'}
          </span>
        </div>
      </div>
    </div>
  )
}
