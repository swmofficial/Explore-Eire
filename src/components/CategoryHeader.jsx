// CategoryHeader.jsx — Fixed top strip. Module tabs, active gold underline.
// Tapping a tab switches active module + auto-opens layer panel.
// Left side has a home button to return to module dashboard.
import useModuleStore from '../store/moduleStore'
import useMapStore from '../store/mapStore'
import { MODULES } from '../lib/moduleConfig'

export default function CategoryHeader({ onHome }) {
  const { activeModule, setActiveModule } = useModuleStore()
  const { setLayerPanelOpen } = useMapStore()

  function handleTabTap(module) {
    setActiveModule(module.id)
    setLayerPanelOpen(true)
  }

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
          alignItems: 'stretch',
        }}
      >
        {/* Home / logo button */}
        <button
          onClick={onHome}
          aria-label="Back to module dashboard"
          style={{
            flexShrink: 0,
            width: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            borderRight: '1px solid #2E3035',
            cursor: 'pointer',
            color: '#E8C96A',
            padding: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* EE monogram */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 2h6M2 9h5M2 16h6" stroke="#E8C96A" strokeWidth="2" strokeLinecap="round"/>
            <path d="M10 2h6M10 9h5M10 16h6" stroke="#E8C96A" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Module tabs — scrollable on small screens */}
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            flex: 1,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {MODULES.map((module) => {
            const isActive = module.id === activeModule
            return (
              <button
                key={module.id}
                onClick={() => handleTabTap(module)}
                style={{
                  flexShrink: 0,
                  padding: '0 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive
                    ? '2px solid #E8C96A'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: isActive ? '#E8C96A' : '#6B7280',
                  transition: 'color 150ms ease, border-color 150ms ease',
                  WebkitTapHighlightColor: 'transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {module.shortLabel}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
