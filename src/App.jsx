import { useState } from 'react'
import useModuleStore from './store/moduleStore'
import BottomNav from './components/BottomNav'
import CornerControls from './components/CornerControls'
import DataSheet from './components/DataSheet'

// Surface → module mapping driven by BottomNav tab selection
const TAB_MODULE_MAP = {
  map:       'prospecting',
  dashboard: 'prospecting',
  learn:     'prospecting',
  profile:   'prospecting',
  settings:  'prospecting',
}

export default function App() {
  const [activeTab, setActiveTab] = useState('map')
  const { setActiveSurface, setActiveModule } = useModuleStore()

  function handleTabChange(tab) {
    setActiveTab(tab)
    setActiveSurface(tab === 'map' ? 'map' : tab)
    setActiveModule(TAB_MODULE_MAP[tab] ?? 'prospecting')
  }

  return (
    <>
      {/* Map placeholder — replace with MapLibre Map component when ready */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0d1117',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.04em',
        }}
      >
        MAP CANVAS
      </div>

      {/* 4-corner floating controls (visible when surface = map) */}
      <CornerControls />

      {/* Data sheet — 3-state bottom sheet for Prospecting module */}
      <DataSheet />

      {/* Bottom nav bar */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </>
  )
}
