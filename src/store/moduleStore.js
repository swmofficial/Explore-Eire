// moduleStore.js — Zustand store: active module, access control
import { create } from 'zustand'

const MODULE_IDS = ['prospecting', 'field_sports', 'hiking', 'archaeology', 'coastal']

const useModuleStore = create((set) => ({
  // Currently active module
  activeModule: 'prospecting',
  setActiveModule: (moduleId) => set({ activeModule: moduleId }),

  // Modules the user has access to
  accessibleModules: [], // populated from module_access table + subscription check
  setAccessibleModules: (modules) => set({ accessibleModules: modules }),

  // Active category tab within the current module's layer panel
  activeCategoryTab: null,
  setActiveCategoryTab: (tab) => set({ activeCategoryTab: tab }),
}))

export { MODULE_IDS }
export default useModuleStore
