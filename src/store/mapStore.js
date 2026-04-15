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
}))

export default useMapStore
