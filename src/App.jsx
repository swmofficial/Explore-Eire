// App.jsx — Root component. Manages view state (dashboard ↔ map).
// Wires all Zustand stores. Renders full map stack in map view.
import { useState } from 'react'
import useModuleStore from './store/moduleStore'
import useMapStore from './store/mapStore'
import useUserStore from './store/userStore'
import ModuleDashboard from './components/ModuleDashboard'
import MapView from './components/Map'
import CategoryHeader from './components/CategoryHeader'
import CornerControls from './components/CornerControls'
import LayerPanel from './components/LayerPanel'

export default function App() {
  const [view, setView] = useState('dashboard') // 'dashboard' | 'map'
  const { setActiveModule } = useModuleStore()
  const { setLayerPanelOpen } = useMapStore()

  function enterModule(moduleId) {
    setActiveModule(moduleId)
    setLayerPanelOpen(false)
    setView('map')
  }

  function goToDashboard() {
    setLayerPanelOpen(false)
    setView('dashboard')
  }

  if (view === 'dashboard') {
    return <ModuleDashboard onEnterModule={enterModule} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      {/* Map is the base layer — always behind everything */}
      <MapView />
      {/* Overlays in z-order */}
      <LayerPanel />
      <CategoryHeader onHome={goToDashboard} />
      <CornerControls />
    </div>
  )
}
