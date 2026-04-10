// ModuleDashboard.jsx — Home screen. 5 module icons, lock/unlock, branding, CTA.
import useUserStore from '../store/userStore'
import { MODULES } from '../lib/moduleConfig'

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="9" width="12" height="9" rx="2" fill="currentColor" opacity="0.6" />
      <path d="M7 9V6.5a3 3 0 016 0V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function ComingSoonBadge() {
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: '#6B7280',
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
          background: '#1A1C20',
          border: isLocked
            ? '1px solid #2E3035'
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
        {/* Lock overlay */}
        {isLocked && (
          <div style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            color: '#6B7280',
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
        color: isLocked ? '#6B7280' : '#E8EAF0',
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
    // Prospecting is accessible on free tier (limited data)
    if (module.id === 'prospecting') return true
    return isPro
  }

  function handleModuleTap(module) {
    if (!module.available) return // data not ready yet
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
      background: '#0A0A0A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 40px)',
      paddingLeft: 'max(env(safe-area-inset-left, 0px), 24px)',
      paddingRight: 'max(env(safe-area-inset-right, 0px), 24px)',
    }}>

      {/* Header — branding */}
      <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
        {/* Wordmark */}
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
          color: '#E8EAF0',
          margin: 0,
          lineHeight: 1.1,
        }}>
          Choose your<br />adventure
        </h1>
        <p style={{
          marginTop: 10,
          fontSize: 14,
          color: '#6B7280',
          fontWeight: 400,
        }}>
          Ireland's all-in-one outdoor platform
        </p>
      </div>

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
            {/* Subscription pitch */}
            <div style={{
              marginBottom: 16,
              padding: '12px 16px',
              background: '#1A1C20',
              border: '1px solid #2E3035',
              borderRadius: 12,
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#E8EAF0' }}>Explorer</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#E8C96A' }}>€9.99/mo</span>
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.4 }}>
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
              <p style={{ marginTop: 10, fontSize: 12, color: '#6B7280' }}>
                Annual plan: <span style={{ color: '#E8C96A' }}>€79/year</span> — save 34%
              </p>
            )}
          </>
        )}

        {/* Attribution */}
        <p style={{
          marginTop: isPro ? 0 : 20,
          fontSize: 11,
          color: '#2E3035',
          textAlign: 'center',
        }}>
          Contains Irish Public Sector Data (GSI) · CC BY 4.0
        </p>
      </div>
    </div>
  )
}
