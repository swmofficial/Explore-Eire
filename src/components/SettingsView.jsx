import { useState } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'
import ProfileSettings from './settings/ProfileSettings'
import PasswordSettings from './settings/PasswordSettings'
import NotificationSettings from './settings/NotificationSettings'
import PremiumSettings from './settings/PremiumSettings'
import HelpSupport from './settings/HelpSupport'

// ── Shared primitives ──────────────────────────────────────────────

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3l4 4-4 4" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function GroupLabel({ children }) {
  return (
    <div style={{
      padding: '20px 16px 8px',
      fontSize: 11, fontWeight: 500, color: 'var(--color-muted)',
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
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function SettingsRow({ icon, label, onPress, right, noBorder, danger }) {
  return (
    <button
      onClick={onPress}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', background: 'none', border: 'none',
        borderBottom: noBorder ? 'none' : '1px solid var(--color-border)',
        cursor: onPress ? 'pointer' : 'default', textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: danger ? 'rgba(232,75,75,0.1)' : 'rgba(232,201,106,0.1)',
        border: `1px solid ${danger ? 'rgba(232,75,75,0.2)' : 'rgba(232,201,106,0.18)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: danger ? 'var(--color-danger)' : 'var(--color-text)' }}>{label}</span>
      {right !== undefined ? right : <ChevronRight />}
    </button>
  )
}

// ── Theme selector (2-option Dark / Light) ─────────────────────────

function ThemeSelector({ theme, setTheme }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {['dark', 'light'].map(t => (
        <button
          key={t}
          onClick={(e) => { e.stopPropagation(); setTheme(t) }}
          style={{
            padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600,
            background: theme === t ? 'var(--color-accent)' : 'var(--color-raised)',
            color: theme === t ? '#0A0A0A' : 'var(--color-muted)',
            transition: 'background 150ms, color 150ms',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {t === 'dark' ? 'Dark' : 'Light'}
        </button>
      ))}
    </div>
  )
}

// ── Delete account confirmation modal ─────────────────────────────

function DeleteAccountModal({ user, onClose }) {
  function handleDelete() {
    const email = encodeURIComponent(user?.email || '')
    const uid = encodeURIComponent(user?.id || '')
    const body = encodeURIComponent(`Please delete my account.\n\nEmail: ${user?.email}\nUser ID: ${user?.id}\n`)
    window.location.href = `mailto:support@exploreeire.ie?subject=Account%20Deletion%20Request&body=${body}`
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, animation: 'backdropFadeIn 200ms ease-out' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 201, width: 'min(92vw, 380px)',
        background: 'var(--color-base)', border: '1px solid var(--color-border)',
        borderRadius: 16, padding: '24px', animation: 'overlayFadeIn 200ms ease-out',
      }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(232,75,75,0.14)', border: '1px solid var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 7v5" stroke="var(--color-danger)" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="10" cy="15" r="1" fill="var(--color-danger)"/>
            <path d="M10 2L2 18h16L10 2z" stroke="var(--color-danger)" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center', marginBottom: 10 }}>Delete Account</h2>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
          This will permanently delete your account and all associated data. <strong style={{ color: 'var(--color-text)' }}>This cannot be undone.</strong>
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
          Tapping the button below will open your email app with a pre-composed deletion request to our support team.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 9, fontSize: 14, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            style={{ flex: 1, padding: '12px', background: 'var(--color-danger)', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Delete My Account
          </button>
        </div>
      </div>
    </>
  )
}

// ── Icons ──────────────────────────────────────────────────────────

const PersonSVG = <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.8" stroke="var(--color-accent)" strokeWidth="1.3"/><path d="M2 14c0-3.314 2.686-5.5 6-5.5S14 10.686 14 14" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinecap="round"/></svg>
const LockSVG = <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="2" stroke="var(--color-accent)" strokeWidth="1.3"/><path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="11" r="1" fill="var(--color-accent)"/></svg>
const BellSVG = <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 0 1 4 4v3l1 1.5H3L4 9V6a4 4 0 0 1 4-4z" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinejoin="round"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinecap="round"/></svg>
const MoonSVG = <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5 5.5 5.5 0 1 0 13.5 9.5z" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinejoin="round"/></svg>
const StarSVG = <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.8 3.8L14 6.6l-3 2.9.7 4.1L8 11.5l-3.7 2.1.7-4.1-3-2.9 4.2-.8L8 2z" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinejoin="round"/></svg>
const QuestionSVG = <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--color-accent)" strokeWidth="1.3"/><path d="M6.3 6a1.7 1.7 0 0 1 3.3.6c0 1.2-1.3 1.6-1.6 2.4" stroke="var(--color-accent)" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="12" r=".6" fill="var(--color-accent)"/></svg>
const TrashSVG = <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4" stroke="var(--color-danger)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>

// ── Main ───────────────────────────────────────────────────────────

export default function SettingsView({ onNavigate }) {
  const [page, setPage] = useState('home')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { user, isGuest, isPro, theme, setTheme, setUser, setIsPro, setShowAuthModal, setAuthModalDefaultTab } = useUserStore()

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setIsPro(false)
  }

  async function handleRateReview() {
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        // Native: prompt the user to rate from the store listing
        // @capacitor-community/rate-app plugin handles this when installed
        alert("Head to the App Store or Play Store to leave us a review — it means the world to us! 🌟")
        return
      }
    } catch { /* Capacitor not available on web */ }
    window.open('https://www.trustpilot.com', '_blank')
  }

  // Sub-page routing
  if (page === 'profile')       return <ProfileSettings onBack={() => setPage('home')} />
  if (page === 'password')      return <PasswordSettings onBack={() => setPage('home')} />
  if (page === 'notifications') return <NotificationSettings onBack={() => setPage('home')} />
  if (page === 'premium')       return <PremiumSettings onBack={() => setPage('home')} />
  if (page === 'help')          return <HelpSupport onBack={() => setPage('home')} />

  return (
    <div style={{
      position: 'absolute', inset: 0, overflowY: 'auto',
      background: 'var(--color-base)', paddingBottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 16px)',
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: 16, paddingLeft: 16, paddingRight: 16,
        textAlign: 'center', borderBottom: '1px solid var(--color-border)',
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>Settings</span>
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
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" stroke="#1A1D2E" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(26,29,46,0.3)"/>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1D2E', marginBottom: 3 }}>Premium Membership</div>
            <div style={{ fontSize: 13, color: '#2A2000' }}>
              {isPro ? 'All features unlocked' : 'Unlock all layers, courses & offline maps'}
            </div>
          </div>
          {isPro ? (
            <div style={{ background: 'rgba(26,29,46,0.25)', borderRadius: 20, padding: '5px 12px', fontSize: 13, fontWeight: 600, color: '#1A1D2E' }}>Active</div>
          ) : (
            <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#1A1D2E', flexShrink: 0 }}>Upgrade</div>
          )}
        </button>
      </div>

      {/* ACCOUNT group */}
      <GroupLabel>Account</GroupLabel>
      <SettingsCard>
        <SettingsRow icon={PersonSVG} label="Profile" onPress={() => setPage('profile')} />
        {user && !isGuest ? (
          <SettingsRow icon={LockSVG} label="Password" onPress={() => setPage('password')} />
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
            opacity: 0.4, pointerEvents: 'none',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(232,201,106,0.1)', border: '1px solid rgba(232,201,106,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {LockSVG}
            </div>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>Password</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="5.5" rx="1.5" stroke="var(--color-muted)" strokeWidth="1.2"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="var(--color-muted)" strokeWidth="1.2"/></svg>
          </div>
        )}
        <SettingsRow icon={BellSVG} label="Notifications" onPress={() => setPage('notifications')} />
        <SettingsRow
          icon={MoonSVG}
          label="Theme"
          noBorder
          right={<ThemeSelector theme={theme} setTheme={setTheme} />}
        />
      </SettingsCard>

      {/* MORE group */}
      <GroupLabel>More</GroupLabel>
      <SettingsCard>
        <SettingsRow icon={StarSVG} label="Rate &amp; Review" onPress={handleRateReview} />
        <SettingsRow icon={QuestionSVG} label="Help &amp; Support" noBorder onPress={() => setPage('help')} />
      </SettingsCard>

      {/* Log out */}
      {(user && !isGuest) && (
        <>
          <button
            onClick={handleSignOut}
            style={{
              display: 'block', width: 'calc(100% - 32px)', margin: '24px 16px 0',
              background: 'transparent', border: '1px solid var(--color-danger)',
              borderRadius: 12, padding: 14,
              fontSize: 16, fontWeight: 700, color: 'var(--color-danger)',
              cursor: 'pointer', fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Log Out
          </button>

          {/* DANGER ZONE */}
          <GroupLabel>Danger Zone</GroupLabel>
          <SettingsCard>
            <SettingsRow
              icon={TrashSVG}
              label="Delete Account"
              danger
              noBorder
              onPress={() => setShowDeleteModal(true)}
            />
          </SettingsCard>
        </>
      )}

      {(!user || isGuest) && (
        <button
          onClick={() => {
            setAuthModalDefaultTab('signin')
            setShowAuthModal(true)
          }}
          style={{
            display: 'block', width: 'calc(100% - 32px)', margin: '24px 16px 0',
            background: 'var(--color-accent)', border: 'none',
            borderRadius: 12, padding: 14,
            fontSize: 16, fontWeight: 700, color: '#0A0A0A',
            cursor: 'pointer', fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Sign In
        </button>
      )}

      {/* Version */}
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-muted)', margin: '20px 0 0' }}>
        Explore Éire v1.0.0
      </p>

      {showDeleteModal && (
        <DeleteAccountModal user={user} onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  )
}
