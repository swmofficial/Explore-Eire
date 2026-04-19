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
import useModuleStore from '../store/moduleStore'

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

function SettingsBtn({ onPress, activeSurface }) {
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
        zIndex: activeSurface !== 'map' ? 5 : 20,
      }}
    >
      {/* Gear / cog icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#E8EAF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#E8EAF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

function CentreOnMeBtn({ onPress, hasLocation, activeSurface }) {
  return (
    <button
      onClick={onPress}
      aria-label="Centre on my location"
      style={{
        ...GLASS,
        position: 'absolute',
        bottom: BOTTOM_OFFSET,
        right: SIDE_OFFSET_R,
        width: 52,
        height: 52,
        borderRadius: 12,
        opacity: hasLocation ? 1 : 0.45,
        zIndex: activeSurface !== 'map' ? 5 : 20,
      }}
    >
      {/* Crosshair icon */}
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="3.5" stroke="#E8EAF0" strokeWidth="1.5"/>
        <path d="M10 2v3.5M10 14.5V18M2 10h3.5M14.5 10H18" stroke="#E8EAF0" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

function LayersBtn({ onPress, activeSurface }) {
  return (
    <button
      id="tour-layers-btn"
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
        zIndex: activeSurface !== 'map' ? 5 : 20,
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

function BasemapBtn({ onPress, activeSurface }) {
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
        zIndex: activeSurface !== 'map' ? 5 : 20,
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

function CameraBtn({ onPress, dataSheetState, activeSurface }) {
  const zIndex = activeSurface !== 'map' ? 5 : dataSheetState === 'collapsed' ? 30 : 10
  return (
    <button
      id="tour-camera-btn"
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
        zIndex,
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
    setAddFindSheetOpen,
    dataSheetState,
    mapInstance,
    userLocation,
  } = useMapStore()
  const { isPro, isGuest, setShowUpgradeSheet } = useUserStore()
  const { activeSurface } = useModuleStore()

  function handleLayersPress() {
    setLayerPanelOpen(true)
  }

  function handleCameraPress() {
    if (!isPro || isGuest) { setShowUpgradeSheet(true); return }
    if (activeSurface === 'mine') {
      setAddFindSheetOpen(true)
    } else {
      setWaypointSheet({ mode: 'add' })
    }
  }

  function handleCentreOnMe() {
    if (!mapInstance || !userLocation) return
    mapInstance.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15, duration: 800 })
  }

  return (
    <>
      <SettingsBtn onPress={() => setSettingsPanelOpen(true)} activeSurface={activeSurface} />
      <LayersBtn onPress={handleLayersPress} activeSurface={activeSurface} />
      <BasemapBtn onPress={() => setBasemapPickerOpen(true)} activeSurface={activeSurface} />
      <CameraBtn onPress={handleCameraPress} dataSheetState={dataSheetState} activeSurface={activeSurface} />
      <CentreOnMeBtn onPress={handleCentreOnMe} hasLocation={!!userLocation} activeSurface={activeSurface} />
    </>
  )
}
