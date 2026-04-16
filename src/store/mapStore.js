// mapStore.js — Zustand store: map state, layers, basemap, session trail
import { create } from 'zustand'

const useMapStore = create((set) => ({
  // Map instance ref (not serialised — set directly)
  mapInstance: null,
  setMapInstance: (map) => set({ mapInstance: map }),

  // Active basemap
  basemap: 'satellite', // 'outdoor' | 'satellite' | 'topo'
  setBasemap: (basemap) => set({ basemap }),

  // 3D terrain toggle
  is3D: false,
  setIs3D: (is3D) => set({ is3D }),

  // Active layer visibility (keyed by layer id)
  // stream_sediment defaults on so gold markers show immediately
  layerVisibility: { stream_sediment: true },
  setLayerVisibility: (layerId, visible) =>
    set((state) => ({
      layerVisibility: { ...state.layerVisibility, [layerId]: visible },
    })),

  // Bottom sheet state
  dataSheetState: 'collapsed', // 'collapsed' | 'half' | 'full'
  setDataSheetState: (s) => set({ dataSheetState: s }),

  // Layer panel (right drawer) — independent of bottom sheet
  layerPanelOpen: false,
  setLayerPanelOpen: (open) => set({ layerPanelOpen: open }),

  // Settings panel open state
  settingsPanelOpen: false,
  setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),

  // Basemap picker open state
  basemapPickerOpen: false,
  setBasemapPickerOpen: (open) => set({ basemapPickerOpen: open }),

  // Selected feature (data point clicked on map)
  selectedFeature: null,
  setSelectedFeature: (feature) => set({ selectedFeature: feature }),

  // Selected sample — drives SampleSheet detail view (null = closed)
  selectedSample: null,
  setSelectedSample: (sample) => set({ selectedSample: sample }),

  // Tier filter for gold circle layers on map
  // 'all' | 'exceptional' | 'high' | 'significant'
  tierFilter: 'all',
  setTierFilter: (f) => set({ tierFilter: f }),

  // Session GPS trail — array of {lat, lng, alt, heading, ts}
  // Rendered as dots on the map canvas when a session is active
  sessionTrail: [],
  appendSessionTrailPoint: (pt) =>
    set((state) => ({ sessionTrail: [...state.sessionTrail, pt] })),
  clearSessionTrail: () => set({ sessionTrail: [] }),

  // Session waypoints — pinned from sample detail sheet
  sessionWaypoints: [],
  addSessionWaypoint: (wp) =>
    set((state) => ({ sessionWaypoints: [...state.sessionWaypoints, wp] })),

  // WaypointSheet — null = closed, { mode: 'add' | 'view', waypoint?: object }
  waypointSheet: null,
  setWaypointSheet: (v) => set({ waypointSheet: v }),

  // Selected mineral locality — drives MineralSheet detail view (null = closed)
  selectedMineral: null,
  setSelectedMineral: (mineral) => set({ selectedMineral: mineral }),

  // Active mineral category — controls which mineral circle layer is visible on the map.
  // null  = no mineral layer shown (Gold tab active or no mineral selected)
  // string = only the layer matching this category is shown
  activeMineralCategory: null,
  setActiveMineralCategory: (cat) => set({ activeMineralCategory: cat }),

  // FindSheet open state
  findSheetOpen: false,
  setFindSheetOpen: (open) => set({ findSheetOpen: open }),

  // Route builder state
  routeBuilderOpen: false,
  setRouteBuilderOpen: (open) => set({ routeBuilderOpen: open }),
  routePoints: [],  // [{lat, lng, id}]
  addRoutePoint: (pt) =>
    set((state) => ({ routePoints: [...state.routePoints, pt] })),
  clearRoutePoints: () => set({ routePoints: [] }),

  // GPS tracking state
  isTracking: false,
  setIsTracking: (v) => set({ isTracking: v }),

  // Elevation profile during tracking — [{elevation, distanceM}]
  elevationProfile: [],
  appendElevationPoint: (pt) =>
    set((state) => ({ elevationProfile: [...state.elevationProfile, pt] })),
  clearElevationProfile: () => set({ elevationProfile: [] }),

  // Waypoints layer visibility toggle
  showWaypoints: true,
  setShowWaypoints: (v) => set({ showWaypoints: v }),

  // Offline manager open state
  showOfflineManager: false,
  setShowOfflineManager: (v) => set({ showOfflineManager: v }),

  // Weather layer last-refresh timestamp (ISO string or null)
  weatherLastUpdated: null,
  setWeatherLastUpdated: (ts) => set({ weatherLastUpdated: ts }),

  // Current user GPS location — updated by Map.jsx watchPosition
  userLocation: null, // { lat, lng }
  setUserLocation: (loc) => set({ userLocation: loc }),

  // Toast notifications — { id, message, type, duration }
  // type: 'success' | 'error' | 'warning' | 'info' | 'offline'
  // duration: ms to show (0 = persistent until removed manually)
  toasts: [],
  addToast: ({ message, type = 'info', duration = 3000 }) => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }))
    return id
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export default useMapStore
