// CornerControls.jsx — 4 corner glass buttons, safe-area aware.
// Layout:
//   Top-left:     📍 Waypoint  → add waypoint (Settings moved to BottomNav)
//   Top-right:    ≡  Layers    → opens LayerPanel
//   Bottom-left:  🗺  Basemap  → opens BasemapPicker
//   Bottom-right: ✛  Centre   → fly to user location
//
// zIndex logic:
// - Sheet collapsed → buttons at 42 (above nav at 40, visible)
// - Sheet half/full → buttons drop to 18 (below DataSheet wrapper at 20)
//   This makes them disappear cleanly behind the sheet with zero flicker.

import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'
import useModuleStore from '../store/moduleStore'

const GLASS = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  cursor: 'pointer',
  color: 'var(--color-text)',
  WebkitTapHighlightColor: 'transparent',
}

const TOP_OFFSET    = 'calc(env(safe-area-inset-top, 0px) + 16px)'
const SIDE_OFFSET_L = 'calc(env(safe-area-inset-left, 0px) + 16px)'
const SIDE_OFFSET_R = 'calc(env(safe-area-inset-right, 0px) + 16px)'
const BOTTOM_OFFSET = 'calc(env(safe-area-inset-bottom, 0px) + 64px + 60px + 16px)'

function cornerZ(activeSurface, dataSheetState, anySheetOpen) {
  if (activeSurface !== 'map') return 5
  if (anySheetOpen || dataSheetState !== 'collapsed') return 18
  return 42
}

function WaypointBtn({ onPress, activeSurface, dataSheetState, anySheetOpen }) {
  return (
    <button
      id="tour-camera-btn"
      onClick={onPress}
      aria-label="Add waypoint"
      style={{
        ...GLASS,
        position: 'absolute',
        top: TOP_OFFSET,
        left: SIDE_OFFSET_L,
        width: 52,
        height: 52,
        borderRadius: 12,
        zIndex: cornerZ(activeSurface, dataSheetState, anySheetOpen),
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M10 2C7.24 2 5 4.24 5 7c0 3.94 5 11 5 11s5-7.06 5-11c0-2.76-2.24-5-5-5z"
          stroke="var(--color-text)" strokeWidth="1.5" strokeLinejoin="round"
        />
        <circle cx="10" cy="7" r="1.8" fill="var(--color-text)"/>
        <path d="M14.5 15v4M12.5 17h4" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

function LayersBtn({ onPress, activeSurface, dataSheetState, anySheetOpen }) {
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
        zIndex: cornerZ(activeSurface, dataSheetState, anySheetOpen),
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M2 6l8-4 8 4-8 4-8-4z" stroke="var(--color-text)" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M2 10l8 4 8-4" stroke="var(--color-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 14l8 4 8-4" stroke="var(--color-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

function BasemapBtn({ onPress, activeSurface, dataSheetState, anySheetOpen }) {
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
        zIndex: cornerZ(activeSurface, dataSheetState, anySheetOpen),
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="var(--color-text)" strokeWidth="1.5"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="var(--color-text)" strokeWidth="1.5"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="var(--color-text)" strokeWidth="1.5"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="var(--color-text)" strokeWidth="1.5"/>
      </svg>
    </button>
  )
}

function CentreOnMeBtn({ onPress, hasLocation, activeSurface, dataSheetState, anySheetOpen }) {
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
        zIndex: cornerZ(activeSurface, dataSheetState, anySheetOpen),
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="3.5" stroke="var(--color-text)" strokeWidth="1.5"/>
        <path d="M10 2v3.5M10 14.5V18M2 10h3.5M14.5 10H18" stroke="var(--color-text)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

export default function CornerControls() {
  const {
    setBasemapPickerOpen,
    setLayerPanelOpen,
    setWaypointSheet,
    dataSheetState,
    mapInstance,
    userLocation,
    waypointSheet,
    selectedSample,
    selectedMineral,
  } = useMapStore()
  const { isPro, isGuest, setShowUpgradeSheet } = useUserStore()
  const { activeSurface } = useModuleStore()

  const anySheetOpen = !!waypointSheet || !!selectedSample || !!selectedMineral

  function handleWaypointPress() {
    if (!isPro || isGuest) { setShowUpgradeSheet(true); return }
    setWaypointSheet({ mode: 'add' })
  }

  function handleCentreOnMe() {
    if (!mapInstance || !userLocation) return
    mapInstance.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15, duration: 800 })
  }

  return (
    <>
      <WaypointBtn
        onPress={handleWaypointPress}
        activeSurface={activeSurface}
        dataSheetState={dataSheetState}
        anySheetOpen={anySheetOpen}
      />
      <LayersBtn
        onPress={() => setLayerPanelOpen(true)}
        activeSurface={activeSurface}
        dataSheetState={dataSheetState}
        anySheetOpen={anySheetOpen}
      />
      <BasemapBtn
        onPress={() => setBasemapPickerOpen(true)}
        activeSurface={activeSurface}
        dataSheetState={dataSheetState}
        anySheetOpen={anySheetOpen}
      />
      <CentreOnMeBtn
        onPress={handleCentreOnMe}
        hasLocation={!!userLocation}
        activeSurface={activeSurface}
        dataSheetState={dataSheetState}
        anySheetOpen={anySheetOpen}
      />
    </>
  )
}
