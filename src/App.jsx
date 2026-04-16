// App.jsx — Root component. Manages view state (dashboard ↔ map).
// Wires auth listener, applies colour theme to <html> data-theme attribute.
import { useState, useEffect } from 'react'
import useModuleStore from './store/moduleStore'
import useMapStore from './store/mapStore'
import useUserStore from './store/userStore'
import { useAuth } from './hooks/useAuth'
import { useSubscription } from './hooks/useSubscription'
import ModuleDashboard from './components/ModuleDashboard'
import MapView from './components/Map'
import SettingsPanel from './components/SettingsPanel'
import AuthModal from './components/AuthModal'
import UpgradeSheet from './components/UpgradeSheet'
import LegalDisclaimerModal from './components/LegalDisclaimerModal'
import StatusToast from './components/StatusToast'

export default function App() {
  useAuth()         // initialise Supabase auth state listener
  useSubscription() // sync subscription status on mount + after Stripe redirect

  const [view, setView] = useState('dashboard') // 'dashboard' | 'map'
  const { setActiveModule } = useModuleStore()
  const { setDataSheetState } = useMapStore()
  const { theme } = useUserStore()

  // Apply theme to <html> so CSS [data-theme] selectors take effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  function enterModule(moduleId) {
    setActiveModule(moduleId)
    setDataSheetState('collapsed')
    setView('map')
  }

  function goToDashboard() {
    setDataSheetState('collapsed')
    setView('dashboard')
  }

  return (
    <>
      {view === 'dashboard' ? (
        <ModuleDashboard onEnterModule={enterModule} />
      ) : (
        <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
          {/* Map renders the map + its own overlaid UI components */}
          <MapView onHome={goToDashboard} />
          {/* App-level panels that sit above Map's overlays */}
          <SettingsPanel />
          <AuthModal />
          <UpgradeSheet />
        </div>
      )}
      {/* Always rendered — can trigger from both dashboard and map views */}
      <LegalDisclaimerModal />
      <StatusToast />
    </>
  )
}
