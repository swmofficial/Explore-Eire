import { triggerHaptic } from '../lib/haptics'

const ACTIVE_COLOR = 'var(--color-accent)'
const INACTIVE_COLOR = 'var(--color-muted)'

function SettingsIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="3" stroke={color} strokeWidth="1.6"/>
      <path
        d="M11 2v2M11 18v2M2 11h2M18 11h2M4.22 4.22l1.42 1.42M16.36 16.36l1.42 1.42M4.22 17.78l1.42-1.42M16.36 5.64l1.42-1.42"
        stroke={color} strokeWidth="1.6" strokeLinecap="round"
      />
    </svg>
  )
}

function DashboardIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" rx="2" stroke={color} strokeWidth="1.6"/>
      <rect x="12" y="2" width="8" height="8" rx="2" stroke={color} strokeWidth="1.6"/>
      <rect x="2" y="12" width="8" height="8" rx="2" stroke={color} strokeWidth="1.6"/>
      <rect x="12" y="12" width="8" height="8" rx="2" stroke={color} strokeWidth="1.6"/>
    </svg>
  )
}

function MapPinIcon({ color }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        stroke={color} strokeWidth="2" fill={`${color}33`}
      />
      <circle cx="12" cy="9" r="2.5" fill={color}/>
    </svg>
  )
}

function BookIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M4 3h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4V3z"
        stroke={color} strokeWidth="1.6" strokeLinejoin="round"
      />
      <path
        d="M18 3h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7V3z"
        stroke={color} strokeWidth="1.6" strokeLinejoin="round"
      />
    </svg>
  )
}

function PersonIcon({ color }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="7" r="4" stroke={color} strokeWidth="1.6"/>
      <path
        d="M2 19c0-4.418 4.03-8 9-8s9 3.582 9 8"
        stroke={color} strokeWidth="1.6" strokeLinecap="round"
      />
    </svg>
  )
}

const TABS = [
  { id: 'settings',  label: 'Settings',  Icon: SettingsIcon },
  { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { id: 'map',       label: null,        Icon: MapPinIcon },
  { id: 'learn',     label: 'Learn',     Icon: BookIcon },
  { id: 'profile',   label: 'Profile',   Icon: PersonIcon },
]

export default function BottomNav({ activeTab, onTabChange }) {
  function handleTab(tab) {
    triggerHaptic('light')
    onTabChange(tab)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'var(--color-nav-bg)',
        borderTop: '1px solid #2E3250',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 40,
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        const isMap = tab.id === 'map'
        const iconColor = isMap ? 'var(--color-base)' : (isActive ? ACTIVE_COLOR : INACTIVE_COLOR)

        if (isMap) {
          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab.id)}
              aria-label="Map"
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: ACTIVE_COLOR,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(232,201,106,0.45)',
                position: 'relative',
                bottom: 10,
                WebkitTapHighlightColor: 'transparent',
                flexShrink: 0,
              }}
            >
              <MapPinIcon color={iconColor} />
            </button>
          )
        }

        return (
          <button
            key={tab.id}
            onClick={() => handleTab(tab.id)}
            aria-label={tab.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 12px',
              WebkitTapHighlightColor: 'transparent',
              flex: 1,
              minWidth: 0,
            }}
          >
            <tab.Icon color={iconColor} />
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
              letterSpacing: '0.01em',
            }}>
              {tab.label}
            </span>
            <div style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: isActive ? ACTIVE_COLOR : 'transparent',
              marginTop: 1,
            }} />
          </button>
        )
      })}
    </div>
  )
}
