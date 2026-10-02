import { create } from 'zustand'

// Available modules
// 'prospecting' | 'field_sports' | 'hiking' | 'archaeology' | 'coastal'

// activeSurface: which surface the user is on
// 'map' — the full-screen map view (DataSheet + CornerControls visible)
// 'dashboard' | 'learn' | 'profile' | 'settings' — other surfaces

const useModuleStore = create((set) => ({
  activeModule: 'prospecting',
  setActiveModule: (module) => set({ activeModule: module }),

  activeSurface: 'map',
  setActiveSurface: (surface) => set({ activeSurface: surface }),
}))

export default useModuleStore
