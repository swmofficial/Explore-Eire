// App.jsx — Root component. Manages view state (dashboard ↔ map).
// Wires auth listener, applies colour theme to <html> data-theme attribute.
import { useState, useEffect } from 'react'
import useModuleStore from './store/moduleStore'
import useMapStore from './store/mapStore'
import useUserStore from './store/userStore'
import { useAuth } from './hooks/useAuth'
import ModuleDashboard from './components/ModuleDashboard'
import MapView from './components/Map'
import CategoryHeader from './components/CategoryHeader'
import CornerControls from './components/CornerControls'
import DataSheet from './components/DataSheet'
import LayerPanel from './components/LayerPanel'
import SettingsPanel from './components/SettingsPanel'
import SampleSheet from './components/SampleSheet'
import AuthModal from './components/AuthModal'

export default function App() {
  useAuth() // initialise Supabase auth state listener

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

  if (view === 'dashboard') {
    return <ModuleDashboard onEnterModule={enterModule} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      {/* Map is the base layer — always behind everything, always dark */}
      <MapView />
      {/* Overlays in z-order */}
      <CategoryHeader onHome={goToDashboard} />
      <CornerControls />
      <DataSheet />
      <LayerPanel />
      <SettingsPanel />
      <SampleSheet />
      <AuthModal />
    </div>
  )
}
