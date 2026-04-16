// CornerControls.jsx — 4 floating glass buttons, safe-area aware.
// Layout:
//   Top-left:     ⚙ Settings
//   Top-right:    ≡ Layers  → opens DataSheet to half state
//   Bottom-left:  🗺 Basemap
//   Bottom-centre:📷 Camera (64×64)
//
// Bottom buttons are raised 76px (60px collapsed sheet + 16px gap)
// so they are always visible above the DataSheet.
import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'

// Shared glass button style
const GLASS = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(10,10,10,0.88)',
  border: '1px solid rgba(232,201,106,0.25)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  cursor: 'pointer',
  color: '#E8EAF0',
  WebkitTapHighlightColor: 'transparent',
}

// Category header height + gap below it
const TOP_OFFSET    = 'calc(env(safe-area-inset-top, 0px) + 44px + 12px)'
const SIDE_OFFSET_L = 'calc(env(safe-area-inset-left, 0px) + 16px)'
const SIDE_OFFSET_R = 'calc(env(safe-area-inset-right, 0px) + 16px)'
// Raised 76px from safe-area: 60px collapsed sheet height + 16px gap
const BOTTOM_OFFSET = 'calc(env(safe-area-inset-bottom, 0px) + 76px)'

function SettingsBtn({ onPress }) {
  return (
    <button
      onClick={onPress}
      aria-label="Settings"
      style={{
        ...GLASS,
        position: 'absolute',
        top: TOP_OFFSET,
        left: SIDE_OFFSET_L,
        width: 52,
        height: 52,
        borderRadius: 12,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="2.5" stroke="#E8EAF0" strokeWidth="1.5"/>
        <path
          d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.1 4.1l1.06 1.06M14.84 14.84l1.06 1.06M4.1 15.9l1.06-1.06M14.84 5.16l1.06-1.06"
          stroke="#E8EAF0"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}

function LayersBtn({ onPress }) {
  return (
    <button
      onClick={onPress}
      aria-label="Layers"
      style={{
        ...GLASS,
        position: 'absolute',
        top: TOP_OFFSET,
        right: SIDE_OFFSET_R,
        width: 52,
        height: 52,
        borderRadius: 12,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M2 6l8-4 8 4-8 4-8-4z" stroke="#E8EAF0" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M2 10l8 4 8-4" stroke="#E8EAF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 14l8 4 8-4" stroke="#E8EAF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

function BasemapBtn({ onPress }) {
  return (
    <button
      onClick={onPress}
      aria-label="Change basemap"
      style={{
        ...GLASS,
        position: 'absolute',
        bottom: BOTTOM_OFFSET,
        left: SIDE_OFFSET_L,
        width: 52,
        height: 52,
        borderRadius: 12,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="#E8EAF0" strokeWidth="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="#E8EAF0" strokeWidth="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="#E8EAF0" strokeWidth="1.5"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="#E8EAF0" strokeWidth="1.5"/>
      </svg>
    </button>
  )
}

function CameraBtn({ onPress }) {
  return (
    <button
      onClick={onPress}
      aria-label="Add waypoint with camera"
      style={{
        ...GLASS,
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 64,
        height: 64,
        borderRadius: 16,
        zIndex: 30,
        border: '1px solid rgba(232,201,106,0.4)',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
          stroke="#E8EAF0"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13" r="4" stroke="#E8EAF0" strokeWidth="1.5"/>
      </svg>
    </button>
  )
}

export default function CornerControls() {
  const {
    setSettingsPanelOpen,
    setBasemapPickerOpen,
    setLayerPanelOpen,
    setWaypointSheet,
  } = useMapStore()
  const { isPro, isGuest, setShowUpgradeSheet } = useUserStore()

  function handleLayersPress() {
    setLayerPanelOpen(true)
  }

  function handleCameraPress() {
    if (!isPro || isGuest) {
      setShowUpgradeSheet(true)
    } else {
      setWaypointSheet({ mode: 'add' })
    }
  }

  return (
    <>
      <SettingsBtn onPress={() => setSettingsPanelOpen(true)} />
      <LayersBtn onPress={handleLayersPress} />
      <BasemapBtn onPress={() => setBasemapPickerOpen(true)} />
      <CameraBtn onPress={handleCameraPress} />
    </>
  )
}
