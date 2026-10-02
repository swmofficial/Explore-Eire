import { create } from 'zustand'

const useMapStore = create((set) => ({
  // ── Map instance ─────────────────────────────────────────────
  mapInstance: null,
  setMapInstance: (map) => set({ mapInstance: map }),

  // ── User location ─────────────────────────────────────────────
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),

  // ── Data sheet state ──────────────────────────────────────────
  // 'collapsed' | 'half' | 'full'
  dataSheetState: 'collapsed',
  setDataSheetState: (state) => set({ dataSheetState: state }),

  // ── Layer visibility ──────────────────────────────────────────
  layerVisibility: {
    gold_heatmap: false,
    bedrock: false,
  },
  setLayerVisibility: (layerId, visible) =>
    set((s) => ({
      layerVisibility: { ...s.layerVisibility, [layerId]: visible },
    })),

  // ── Tier filter ───────────────────────────────────────────────
  tierFilter: 'all',
  setTierFilter: (filter) => set({ tierFilter: filter }),

  // ── Selected items (for detail sheets) ───────────────────────
  selectedSample: null,
  setSelectedSample: (sample) => set({ selectedSample: sample }),

  selectedMineral: null,
  setSelectedMineral: (mineral) => set({ selectedMineral: mineral }),

  // ── Active mineral category (synced from DataSheet tab) ───────
  activeMineralCategory: null,
  setActiveMineralCategory: (cat) => set({ activeMineralCategory: cat }),

  // ── Panel / sheet open states ─────────────────────────────────
  settingsPanelOpen: false,
  setSettingsPanelOpen: (v) => set({ settingsPanelOpen: v }),

  basemapPickerOpen: false,
  setBasemapPickerOpen: (v) => set({ basemapPickerOpen: v }),

  layerPanelOpen: false,
  setLayerPanelOpen: (v) => set({ layerPanelOpen: v }),

  // waypointSheet: null | { mode: 'add' | 'edit', waypoint?: object }
  waypointSheet: null,
  setWaypointSheet: (sheet) => set({ waypointSheet: sheet }),

  addFindSheetOpen: false,
  setAddFindSheetOpen: (v) => set({ addFindSheetOpen: v }),
}))

export default useMapStore
