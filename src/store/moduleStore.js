// moduleStore.js — Zustand store: active module, access control
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MODULE_IDS = ['prospecting', 'field_sports', 'hiking', 'discover', 'coastal']

const useModuleStore = create(
  persist(
    (set) => ({
      // Currently active module
      activeModule: 'prospecting',
      setActiveModule: (moduleId) => set({ activeModule: moduleId }),

      // Modules the user has access to
      accessibleModules: [], // populated from module_access table + subscription check
      setAccessibleModules: (modules) => set({ accessibleModules: modules }),

      // Active category tab within the current module's layer panel
      activeCategoryTab: null,
      setActiveCategoryTab: (tab) => set({ activeCategoryTab: tab }),

      // Surface state: 'map' (default) | 'none'
      activeSurface: 'map',
      setActiveSurface: (surface) => set({ activeSurface: surface }),
    }),
    {
      name: 'ee-module-prefs',
      partialize: (state) => ({ activeModule: state.activeModule }),
    },
  ),
)

export { MODULE_IDS }
export default useModuleStore
