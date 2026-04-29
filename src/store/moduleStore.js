// moduleStore.js — Zustand store: active module, access control
import { create } from 'zustand'

const MODULE_IDS = ['prospecting', 'field_sports', 'hiking', 'discover', 'coastal']

const useModuleStore = create((set) => ({
  // Persisted via ee_active_module (manual IIFE + localStorage.setItem pattern — task-013).
  // Zustand persist was unreliable in the deployed environment for this store.
  activeModule: (() => {
    try { return localStorage.getItem('ee_active_module') || 'prospecting' } catch { return 'prospecting' }
  })(),
  setActiveModule: (moduleId) => {
    try { localStorage.setItem('ee_active_module', moduleId) } catch {}
    set({ activeModule: moduleId })
  },

  // Modules the user has access to
  accessibleModules: [], // populated from module_access table + subscription check
  setAccessibleModules: (modules) => set({ accessibleModules: modules }),

  // Active category tab within the current module's layer panel
  activeCategoryTab: null,
  setActiveCategoryTab: (tab) => set({ activeCategoryTab: tab }),

  // Surface state: 'map' (default) | 'none'
  activeSurface: 'map',
  setActiveSurface: (surface) => set({ activeSurface: surface }),
}))

export { MODULE_IDS }
export default useModuleStore
