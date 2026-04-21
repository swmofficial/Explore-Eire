// SettingsPanel.jsx — Left drawer. User profile, theme selector, sign out, legal.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'
import LegalDisclaimerModal from './LegalDisclaimerModal'

// ── Theme swatch ───────────────────────────────────────────────────
const THEMES = [
  {
    id: 'dark',
    label: 'Dark',
    swatch: ['#0A0A0A', '#111214', 'var(--color-accent)'],
  },
  {
    id: 'light',
    label: 'Light',
    swatch: ['#FFFFFF', '#F3F4F6', 'var(--color-accent)'],
  },
]

function ThemeOption({ themeConfig, active, onSelect }) {
  const [a, b, c] = themeConfig.swatch
  return (
    <button
      onClick={() => onSelect(themeConfig.id)}
      aria-pressed={active}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 7,
        padding: '10px 6px',
        background: active ? 'var(--color-raised)' : 'var(--color-surface)',
        border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 10,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
    >
      {/* Mini colour swatch */}
      <div style={{ display: 'flex', gap: 3 }}>
        {[a, b, c].map((col, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: col,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: active ? 600 : 400,
          color: active ? 'var(--color-accent)' : 'var(--color-muted)',
          letterSpacing: '0.04em',
        }}
      >
        {themeConfig.label}
      </span>
    </button>
  )
}

// ── Row item ───────────────────────────────────────────────────────
function Row({ label, value, onPress, chevron = true, danger = false }) {
  const inner = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '13px 16px',
        borderBottom: '1px solid var(--color-surface)',
        cursor: onPress ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
      onClick={onPress}
    >
      <span style={{ fontSize: 14, color: danger ? 'var(--color-danger)' : 'var(--color-primary)', fontWeight: 400 }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {value && (
          <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{value}</span>
        )}
        {chevron && onPress && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5 3l4 4-4 4" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </div>
  )
  return inner
}

// ── Section label ──────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div
      style={{
        padding: '14px 16px 6px',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--color-muted)',
      }}
    >
      {children}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────
export default function SettingsPanel() {
  const { settingsPanelOpen, setSettingsPanelOpen } = useMapStore()
  const { user, isGuest, isPro, theme, setTheme, setShowAuthModal, setUser, setIsPro, setShowOnboarding } = useUserStore()
  const [showLegal, setShowLegal] = useState(false)

  function handleReplayTour() {
    localStorage.setItem('ee_onboarded', 'false')
    setSettingsPanelOpen(false)
    setShowOnboarding(true)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setIsPro(false)
    setSettingsPanelOpen(false)
  }

  function handleSignIn() {
    setSettingsPanelOpen(false)
    setShowAuthModal(true)
  }

  return (
    <>
      {/* Backdrop */}
      {settingsPanelOpen && (
        <div
          onClick={() => setSettingsPanelOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 29,
            animation: 'backdropFadeIn 200ms ease-out',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'min(80vw, 320px)',
          background: 'var(--color-base)',
          borderRight: '1px solid var(--color-border)',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          transform: settingsPanelOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 260ms ease-out',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>
            Settings
          </span>
          <button
            onClick={() => setSettingsPanelOpen(false)}
            aria-label="Close settings"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-muted)',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

          {/* ── Account ── */}
          <SectionLabel>Account</SectionLabel>
          {user ? (
            <>
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--color-surface)',
                }}
              >
                <p style={{ fontSize: 13, color: 'var(--color-primary)', margin: 0, fontWeight: 500 }}>
                  {user.email}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '3px 0 0' }}>
                  {isPro ? '✦ Explorer plan' : 'Free tier'}
                </p>
              </div>
              <Row label="Sign out" onPress={handleSignOut} danger />
            </>
          ) : isGuest ? (
            <>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-surface)' }}>
                <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
                  Browsing as guest
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '3px 0 0' }}>
                  t6/t7 data only · No waypoints
                </p>
              </div>
              <Row label="Sign in / Sign up" onPress={handleSignIn} />
            </>
          ) : (
            <Row label="Sign in / Sign up" onPress={handleSignIn} />
          )}

          {/* ── Theme ── */}
          <SectionLabel>Theme</SectionLabel>
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '8px 16px 16px',
            }}
          >
            {THEMES.map((t) => (
              <ThemeOption
                key={t.id}
                themeConfig={t}
                active={theme === t.id}
                onSelect={setTheme}
              />
            ))}
          </div>

          {/* ── Subscription ── */}
          {!isPro && user && (
            <>
              <SectionLabel>Subscription</SectionLabel>
              <div
                style={{
                  margin: '0 16px 12px',
                  padding: '12px',
                  background: 'rgba(232,201,106,0.08)',
                  border: '1px solid rgba(232,201,106,0.2)',
                  borderRadius: 10,
                }}
              >
                <p style={{ fontSize: 13, color: '#C9A84C', margin: '0 0 8px', fontWeight: 500 }}>
                  Explorer — €9.99/mo
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0, lineHeight: 1.4 }}>
                  All 5 modules · Offline maps · GPS tracking · 3D terrain
                </p>
              </div>
            </>
          )}

          {/* ── Legal ── */}
          <SectionLabel>Legal</SectionLabel>
          <Row label="Replay intro tour" onPress={handleReplayTour} />
          <Row label="Legal Disclaimer" onPress={() => setShowLegal(true)} />
          <div style={{ padding: '10px 16px' }}>
            <p style={{ fontSize: 11, color: 'var(--color-muted)', margin: 0, lineHeight: 1.5 }}>
              Contains Irish Public Sector Data (Geological Survey Ireland) licensed under CC BY 4.0
            </p>
          </div>

        </div>

        {/* Footer version */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: 11, color: 'var(--color-border)', margin: 0, textAlign: 'center' }}>
            Explore Eire v0.2.0
          </p>
        </div>
      </div>

      {/* Legal disclaimer — shown on demand regardless of acceptance state */}
      {showLegal && (
        <LegalDisclaimerModal forceShow onClose={() => setShowLegal(false)} />
      )}
    </>
  )
}
