import { useState } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'
import ProfileSettings from './settings/ProfileSettings'
import PasswordSettings from './settings/PasswordSettings'
import NotificationSettings from './settings/NotificationSettings'
import PremiumSettings from './settings/PremiumSettings'

// ── Shared primitives ──────────────────────────────────────────────

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3l4 4-4 4" stroke="#6B6F8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function Toggle({ on, onToggle }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      style={{
        width: 46, height: 26, borderRadius: 13,
        background: on ? '#E8C96A' : '#3A3D6A',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 200ms ease',
        flexShrink: 0, WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#E8EAF0', transition: 'left 200ms ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

function GroupLabel({ children }) {
  return (
    <div style={{
      padding: '20px 16px 8px',
      fontSize: 11, fontWeight: 500, color: '#6B6F8A',
      textTransform: 'uppercase', letterSpacing: '0.08em',
    }}>
      {children}
    </div>
  )
}

function SettingsCard({ children }) {
  return (
    <div style={{
      margin: '0 16px',
      background: '#252840', border: '1px solid #2E3250',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function SettingsRow({ icon, label, onPress, right, noBorder }) {
  return (
    <button
      onClick={onPress}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', background: 'none', border: 'none',
        borderBottom: noBorder ? 'none' : '1px solid #2E3250',
        cursor: onPress ? 'pointer' : 'default', textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(232,201,106,0.1)', border: '1px solid rgba(232,201,106,0.18)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#E8EAF0' }}>{label}</span>
      {right ?? <ChevronRight />}
    </button>
  )
}

// ── Icons ──────────────────────────────────────────────────────────

function Icon({ children }) {
  return <>{children}</>
}

const PersonSVG = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="2.8" stroke="#E8C96A" strokeWidth="1.3"/>
    <path d="M2 14c0-3.314 2.686-5.5 6-5.5S14 10.686 14 14" stroke="#E8C96A" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const LockSVG = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="7" rx="2" stroke="#E8C96A" strokeWidth="1.3"/>
    <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="#E8C96A" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="8" cy="11" r="1" fill="#E8C96A"/>
  </svg>
)

const BellSVG = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2a4 4 0 0 1 4 4v3l1 1.5H3L4 9V6a4 4 0 0 1 4-4z" stroke="#E8C96A" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" stroke="#E8C96A" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const MoonSVG = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5 5.5 5.5 0 1 0 13.5 9.5z" stroke="#E8C96A" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

const StarSVG = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2l1.8 3.8L14 6.6l-3 2.9.7 4.1L8 11.5l-3.7 2.1.7-4.1-3-2.9 4.2-.8L8 2z" stroke="#E8C96A" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

const QuestionSVG = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="#E8C96A" strokeWidth="1.3"/>
    <path d="M6.3 6a1.7 1.7 0 0 1 3.3.6c0 1.2-1.3 1.6-1.6 2.4" stroke="#E8C96A" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="8" cy="12" r=".6" fill="#E8C96A"/>
  </svg>
)

// ── Main ───────────────────────────────────────────────────────────

export default function SettingsView({ onNavigate }) {
  const [page, setPage] = useState('home')
  const { user, isGuest, isPro, theme, setTheme, setUser, setIsPro, setShowAuthModal } = useUserStore()

  const isDarkMode = theme === 'dark' || theme === 'eire'

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setIsPro(false)
  }

  // Sub-page routing
  if (page === 'profile')       return <ProfileSettings onBack={() => setPage('home')} />
  if (page === 'password')      return <PasswordSettings onBack={() => setPage('home')} />
  if (page === 'notifications') return <NotificationSettings onBack={() => setPage('home')} />
  if (page === 'premium')       return <PremiumSettings onBack={() => setPage('home')} />

  // ── Home screen ────────────────────────────────────────────────
  return (
    <div style={{
      position: 'absolute', inset: 0, overflowY: 'auto',
      background: '#1A1D2E', paddingBottom: 80,
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: 16, paddingLeft: 16, paddingRight: 16,
        textAlign: 'center', borderBottom: '1px solid #2E3250',
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#E8EAF0' }}>Settings</span>
      </div>

      {/* Premium banner */}
      <div style={{ padding: '20px 16px 0' }}>
        <button
          onClick={() => setPage('premium')}
          style={{
            width: '100%',
            background: isPro
              ? 'linear-gradient(135deg, #7A6010, #C9A84C)'
              : 'linear-gradient(135deg, #B8860B, #E8C96A)',
            borderRadius: 16, padding: 18, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {/* Star icon */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path
              d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
              stroke="#1A1D2E" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(26,29,46,0.3)"
            />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1D2E', marginBottom: 3 }}>
              Premium Membership
            </div>
            <div style={{ fontSize: 13, color: '#2A2000' }}>
              {isPro ? 'All features unlocked' : 'Unlock all layers, courses & offline maps'}
            </div>
          </div>
          {isPro ? (
            <div style={{
              background: 'rgba(26,29,46,0.25)', borderRadius: 20,
              padding: '5px 12px', fontSize: 13, fontWeight: 600, color: '#1A1D2E',
            }}>
              Active
            </div>
          ) : (
            <div style={{
              background: '#FFFFFF', borderRadius: 20,
              padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#1A1D2E',
              flexShrink: 0,
            }}>
              Upgrade
            </div>
          )}
        </button>
      </div>

      {/* ACCOUNT group */}
      <GroupLabel>Account</GroupLabel>
      <SettingsCard>
        <SettingsRow icon={PersonSVG} label="Profile" onPress={() => setPage('profile')} />
        <SettingsRow icon={LockSVG} label="Password" onPress={() => setPage('password')} />
        <SettingsRow icon={BellSVG} label="Notifications" onPress={() => setPage('notifications')} />
        <SettingsRow
          icon={MoonSVG}
          label="Dark Mode"
          noBorder
          right={
            <Toggle
              on={isDarkMode}
              onToggle={() => setTheme(isDarkMode ? 'light' : 'dark')}
            />
          }
        />
      </SettingsCard>

      {/* MORE group */}
      <GroupLabel>More</GroupLabel>
      <SettingsCard>
        <SettingsRow
          icon={StarSVG}
          label="Rate &amp; Review"
          onPress={() => console.log('[SettingsView] Rate & Review — App Store URL to be wired')}
        />
        <SettingsRow
          icon={QuestionSVG}
          label="Help &amp; Support"
          noBorder
          onPress={() => console.log('[SettingsView] Help & Support — to be wired')}
        />
      </SettingsCard>

      {/* Log out */}
      {(user && !isGuest) && (
        <button
          onClick={handleSignOut}
          style={{
            display: 'block', width: 'calc(100% - 32px)', margin: '24px 16px 0',
            background: 'transparent', border: '1px solid #C0392B',
            borderRadius: 12, padding: 14,
            fontSize: 16, fontWeight: 700, color: '#C0392B',
            cursor: 'pointer', fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Log Out
        </button>
      )}

      {(!user || isGuest) && (
        <button
          onClick={() => setShowAuthModal(true)}
          style={{
            display: 'block', width: 'calc(100% - 32px)', margin: '24px 16px 0',
            background: '#E8C96A', border: 'none',
            borderRadius: 12, padding: 14,
            fontSize: 16, fontWeight: 700, color: '#1A1D2E',
            cursor: 'pointer', fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Sign In
        </button>
      )}

      {/* Version */}
      <p style={{ textAlign: 'center', fontSize: 12, color: '#4A4D6A', margin: '20px 0 0' }}>
        Explore Éire v1.0.0
      </p>
    </div>
  )
}
