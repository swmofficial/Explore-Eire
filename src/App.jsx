// App.jsx — Root component. 5-tab navigation shell.
// Wires auth listener, applies colour theme to <html> data-theme attribute.
// Path-based routing (no React Router): /subscription/success and /subscription/cancel
// are handled by checking window.location.pathname on mount.
import { useState, useEffect } from 'react'
import useUserStore from './store/userStore'
import { useAuth } from './hooks/useAuth'
import { useSubscription } from './hooks/useSubscription'
import MapView from './components/Map'
import BottomNav from './components/BottomNav'
// import SettingsPanel from './components/SettingsPanel'   // ARCHIVED — replaced by Settings tab
import AuthModal from './components/AuthModal'
import UpgradeSheet from './components/UpgradeSheet'
import LegalDisclaimerModal from './components/LegalDisclaimerModal'
import StatusToast from './components/StatusToast'
import SplashScreen from './components/SplashScreen'
import OfflineManager from './components/OfflineManager'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import SubscriptionCancel from './pages/SubscriptionCancel'
import Onboarding from './components/Onboarding'

const PATH = window.location.pathname

export default function App() {
  useAuth()         // initialise Supabase auth state listener
  useSubscription() // sync subscription status on mount + after Stripe redirect

  // All hooks must be called before any conditional return (Rules of Hooks)
  const [splashDone, setSplashDone] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const { theme, showOnboarding, setShowOnboarding } = useUserStore()

  // Initialise onboarding state once on mount from localStorage
  useEffect(() => {
    if (localStorage.getItem('ee_onboarded') !== 'true') {
      setShowOnboarding(true)
    }
  }, [])

  // Apply theme to <html> so CSS [data-theme] selectors take effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Path-based page routing — checked once on mount (PATH is module-level const)
  if (PATH === '/subscription/success') return <SubscriptionSuccess />
  if (PATH === '/subscription/cancel') return <SubscriptionCancel />

  return (
    <>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: 'var(--color-void)' }}>
        {/* Map always mounted — visibility toggled with CSS to preserve WebGL/MapLibre context */}
        <div style={{
          position: 'absolute',
          inset: 0,
          visibility: activeTab === 'map' ? 'visible' : 'hidden',
          pointerEvents: activeTab === 'map' ? 'auto' : 'none',
          zIndex: activeTab === 'map' ? 1 : -1,
        }}>
          <MapView />
        </div>

        {/* Non-map tabs rendered conditionally */}
        {activeTab !== 'map' && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            {activeTab === 'dashboard' && <div style={{ color: 'white', padding: 40 }}>Dashboard — coming Phase 2</div>}
            {activeTab === 'settings' && <div style={{ color: 'white', padding: 40 }}>Settings — coming Phase 3</div>}
            {activeTab === 'learn' && <div style={{ color: 'white', padding: 40 }}>Learn — coming Phase 4</div>}
            {activeTab === 'profile' && <div style={{ color: 'white', padding: 40 }}>Profile — coming Phase 5</div>}
          </div>
        )}

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* App-level overlays */}
        <AuthModal />
        <UpgradeSheet />
        <LegalDisclaimerModal />
        <StatusToast />
        <OfflineManager />
        {showOnboarding && (
          <Onboarding
            onComplete={() => setShowOnboarding(false)}
            onEnterTour={() => setActiveTab('map')}
          />
        )}
      </div>
    </>
  )
}
