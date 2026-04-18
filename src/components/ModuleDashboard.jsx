// ModuleDashboard.jsx — Home screen. 5 module icons, lock/unlock, branding, CTA.
// "Sign up free" button opens AuthModal. AuthModal has "Continue as guest" link.
import { useState, useEffect } from 'react'
import useUserStore from '../store/userStore'
import { MODULES } from '../lib/moduleConfig'
import { supabase } from '../lib/supabase'
import AuthModal from './AuthModal'

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="9" width="12" height="9" rx="2" fill="currentColor" opacity="0.6" />
      <path d="M7 9V6.5a3 3 0 016 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getFirstName(user) {
  if (!user) return 'Explorer'
  const full = user.user_metadata?.full_name
  if (full) return full.split(' ')[0]
  const email = user.email ?? ''
  const prefix = email.split('@')[0]
  if (!prefix) return 'Explorer'
  return prefix.charAt(0).toUpperCase() + prefix.slice(1)
}

function DashboardHeader({ user }) {
  const [locationLine, setLocationLine] = useState(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const [geoRes, countRes] = await Promise.all([
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`),
            supabase
              .from('gold_samples')
              .select('id', { count: 'exact', head: true })
              .gte('au_ppb', 100)
              .gte('lat', lat - 0.9)
              .lte('lat', lat + 0.9)
              .gte('lng', lng - 1.1)
              .lte('lng', lng + 1.1),
          ])
          const geo = await geoRes.json()
          const county = geo?.address?.county ?? geo?.address?.state
          const count = countRes.count ?? 0
          if (county && count > 0) {
            setLocationLine(`${count} high-grade sample${count === 1 ? '' : 's'} near ${county}`)
          }
        } catch {
          // silent fail
        }
      },
      () => {} // denied — no location line shown
    )
  }, [])

  return (
    <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        color: '#E8C96A',
        marginBottom: 12,
      }}>
        Explore Eire
      </div>
      <h1 style={{
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'var(--color-primary)',
        margin: 0,
        lineHeight: 1.1,
      }}>
        {getGreeting()},<br />{getFirstName(user)}
      </h1>
      <p style={{
        marginTop: 10,
        fontSize: 14,
        color: 'var(--color-muted)',
        fontWeight: 400,
        marginBottom: 0,
      }}>
        Ireland's all-in-one outdoor platform
      </p>
      {locationLine && (
        <p style={{
          marginTop: 6,
          fontSize: 12,
          color: '#E8C96A',
          fontWeight: 500,
          marginBottom: 0,
        }}>
          {locationLine}
        </p>
      )}
    </div>
  )
}

function ComingSoonBadge() {
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'var(--color-muted)',
      marginTop: 2,
    }}>
      Soon
    </span>
  )
}

function ModuleIcon({ module, unlocked, onTap }) {
  const isLocked = !unlocked
  const isComingSoon = !module.available

  return (
    <button
      onClick={onTap}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        background: 'none',
        border: 'none',
        cursor: isComingSoon ? 'default' : 'pointer',
        padding: 0,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Icon box */}
      <div
        style={{
          position: 'relative',
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'var(--color-surface)',
          border: isLocked
            ? '1px solid var(--color-border)'
            : `1.5px solid ${module.accent}`,
          opacity: isLocked ? 0.45 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 30,
          transition: 'opacity 200ms, transform 80ms',
        }}
      >
        <span role="img" aria-label={module.label}>{module.icon}</span>
        {isLocked && (
          <div style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            color: 'var(--color-muted)',
            lineHeight: 0,
          }}>
            <LockIcon />
          </div>
        )}
      </div>

      {/* Label */}
      <span style={{
        fontSize: 8,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: isLocked ? 'var(--color-muted)' : 'var(--color-primary)',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: 80,
      }}>
        {module.shortLabel}
      </span>

      {isComingSoon && isLocked && <ComingSoonBadge />}
    </button>
  )
}

export default function ModuleDashboard({ onEnterModule }) {
  const { user, isPro, setShowAuthModal, setShowUpgradeSheet } = useUserStore()

  function isUnlocked(module) {
    if (module.id === 'prospecting') return true
    return isPro
  }

  function handleModuleTap(module) {
    if (!module.available) return
    if (module.id === 'prospecting') {
      onEnterModule(module.id)
      return
    }
    if (isPro) {
      onEnterModule(module.id)
    } else {
      setShowUpgradeSheet(true)
    }
  }

  function handleCTA() {
    if (!user) {
      setShowAuthModal(true)
    } else {
      setShowUpgradeSheet(true)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--color-void)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
      paddingLeft: 'max(env(safe-area-inset-left, 0px), 24px)',
      paddingRight: 'max(env(safe-area-inset-right, 0px), 24px)',
    }}>

      {/* Header */}
      <DashboardHeader user={user} />

      {/* Module grid */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 20,
        maxWidth: 320,
        flex: '1 1 auto',
        alignContent: 'center',
      }}>
        {MODULES.map((module) => (
          <ModuleIcon
            key={module.id}
            module={module}
            unlocked={isUnlocked(module)}
            onTap={() => handleModuleTap(module)}
          />
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 320, textAlign: 'center' }}>
        {!isPro && (
          <>
            <div style={{
              marginBottom: 16,
              padding: '12px 16px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>Explorer</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#E8C96A' }}>€9.99/mo</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: 0, lineHeight: 1.4 }}>
                All 5 modules · Offline maps · GPS tracking · 3D terrain
              </p>
            </div>

            <button
              onClick={handleCTA}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: '#E8C96A',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {user ? 'Subscribe — Unlock all modules' : 'Sign up free'}
            </button>

            {user && (
              <p style={{ marginTop: 10, fontSize: 12, color: 'var(--color-muted)' }}>
                Annual plan: <span style={{ color: '#E8C96A' }}>€79/year</span> — save 34%
              </p>
            )}
          </>
        )}

        <p style={{
          marginTop: isPro ? 0 : 20,
          fontSize: 11,
          color: 'var(--color-border)',
          textAlign: 'center',
        }}>
          Contains Irish Public Sector Data (GSI) · CC BY 4.0
        </p>
      </div>

      {/* AuthModal — mounted here so it appears over the dashboard */}
      <AuthModal />
    </div>
  )
}
