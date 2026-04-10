// mapStore.js — Zustand store: map state, layers, basemap
import { create } from 'zustand'

const useMapStore = create((set) => ({
  // Map instance ref (not serialised — set directly)
  mapInstance: null,
  setMapInstance: (map) => set({ mapInstance: map }),

  // Active basemap
  basemap: 'outdoor', // 'outdoor' | 'satellite' | 'topo'
  setBasemap: (basemap) => set({ basemap }),

  // 3D terrain toggle
  is3D: false,
  setIs3D: (is3D) => set({ is3D }),

  // Active layer visibility (keyed by layer id)
  layerVisibility: {},
  setLayerVisibility: (layerId, visible) =>
    set((state) => ({
      layerVisibility: { ...state.layerVisibility, [layerId]: visible },
    })),

  // Layer panel open state
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
}))

export default useMapStore
