// sauron watch// App.jsx — Root component. 5-tab navigation shell.
// Wires auth listener, applies colour theme to <html> data-theme attribute.
// Path-based routing (no React Router): /subscription/success and /subscription/cancel
// are handled by checking window.location.pathname on mount.
import { useState, useEffect } from 'react'
import useUserStore from './store/userStore'
import useModuleStore from './store/moduleStore'
import { useAuth } from './hooks/useAuth'
import { useSubscription } from './hooks/useSubscription'
import MapView from './components/Map'
import BottomNav from './components/BottomNav'
import DashboardView from './components/DashboardView'
import SettingsView from './components/SettingsView'
import ProfileView from './components/ProfileView'
import LearnView from './components/LearnView'
import AuthModal from './components/AuthModal'
import UpgradeSheet from './components/UpgradeSheet'
import LegalDisclaimerModal from './components/LegalDisclaimerModal'
import StatusToast from './components/StatusToast'
import SplashScreen from './components/SplashScreen'
import OfflineManager from './components/OfflineManager'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import SubscriptionCancel from './pages/SubscriptionCancel'
import Onboarding from './components/Onboarding'
import NotificationPrePrompt from './components/NotificationPrePrompt'

const PATH = window.location.pathname

export default function App() {
  useAuth()         // initialise Supabase auth state listener
  useSubscription() // sync subscription status on mount + after Stripe redirect

  // All hooks must be called before any conditional return (Rules of Hooks)
  const [splashDone, setSplashDone] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const { theme, showOnboarding, setShowOnboarding } = useUserStore()
  const { setActiveSurface } = useModuleStore()

  // Sync activeSurface with active tab so CornerControls hide on non-map tabs
  useEffect(() => {
    setActiveSurface(activeTab === 'map' ? 'map' : 'none')
  }, [activeTab])

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

        {/* Non-map tabs always mounted — display:none preserves component state across tab switches */}
        <div style={{ position: 'absolute', inset: 0, zIndex: activeTab !== 'map' ? 1 : -1, pointerEvents: activeTab !== 'map' ? 'auto' : 'none' }}>
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <DashboardView onNavigate={setActiveTab} />
          </div>
          <div style={{ display: activeTab === 'settings' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <SettingsView onNavigate={setActiveTab} />
          </div>
          <div style={{ display: activeTab === 'learn' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <LearnView />
          </div>
          <div style={{ display: activeTab === 'profile' ? 'block' : 'none', height: '100%', overflowY: 'auto' }}>
            <ProfileView onNavigate={setActiveTab} />
          </div>
        </div>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* App-level overlays */}
        <AuthModal />
        <UpgradeSheet />
        <LegalDisclaimerModal />
        <StatusToast />
        <OfflineManager />
        <NotificationPrePrompt />
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
