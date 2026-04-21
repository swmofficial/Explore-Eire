// UpgradeSheet.jsx — Paywall bottom sheet.
// Opens when userStore.showUpgradeSheet === true.
// Tapping a plan pill calls handleSubscribe directly — no separate CTA.
import { useState } from 'react'
import useUserStore from '../store/userStore'
import useMapStore from '../store/mapStore'

const FEATURES = [
  'All 5 modules unlocked',
  'Full gold data — all 7 tiers',
  'GSI geology and geochemistry layers',
  'Unlimited waypoints and photos',
  'Offline map downloads',
  'GPS route tracking',
  '3D terrain',
]

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid rgba(10,10,10,0.3)',
        borderTopColor: '#0A0A0A',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        verticalAlign: 'middle',
        marginLeft: 6,
      }}
    />
  )
}

export default function UpgradeSheet() {
  const { showUpgradeSheet, setShowUpgradeSheet, user } = useUserStore()
  // loading: null | 'monthly' | 'annual'
  const [loading, setLoading] = useState(null)

  async function handleSubscribe(plan) {
    setLoading(plan)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId: user?.id }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      console.error('Checkout error:', err)
      useMapStore.getState().addToast({ type: 'error', message: err.message || 'Checkout failed. Please try again.' })
    } finally {
      setLoading(null)
    }
  }

  if (!showUpgradeSheet) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setShowUpgradeSheet(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 59,
          animation: 'backdropFadeIn 200ms ease-out',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: 'var(--color-surface)',
          borderRadius: '16px 16px 0 0',
          padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 24px)',
          animation: 'slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--color-border)' }} />
        </div>

        <div style={{ padding: '0 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
              Upgrade to Explorer
            </h2>
            <button
              onClick={() => setShowUpgradeSheet(false)}
              aria-label="Close"
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

          {/* Feature list */}
          <div style={{ marginBottom: 20 }}>
            {FEATURES.map((feature) => (
              <div
                key={feature}
                style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10 }}
              >
                <span style={{ color: 'var(--color-accent)', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--color-primary)' }}>{feature}</span>
              </div>
            ))}
          </div>

          {/* Subscribe buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {/* Monthly */}
            <button
              onClick={() => handleSubscribe('monthly')}
              disabled={!!loading || !user}
              style={{
                flex: 1,
                padding: '14px 8px',
                borderRadius: 12,
                border: '1.5px solid var(--color-border)',
                background: 'var(--color-raised)',
                cursor: loading || !user ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                opacity: loading === 'annual' ? 0.5 : 1,
                WebkitTapHighlightColor: 'transparent',
                transition: 'opacity 150ms ease',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 2 }}>
                Monthly
                {loading === 'monthly' && <Spinner />}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>€9.99/month</div>
            </button>

            {/* Annual */}
            <button
              onClick={() => handleSubscribe('annual')}
              disabled={!!loading || !user}
              style={{
                flex: 1,
                padding: '14px 8px',
                borderRadius: 12,
                border: '1.5px solid #E8C96A',
                background: 'rgba(232,201,106,0.08)',
                cursor: loading || !user ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                opacity: loading === 'monthly' ? 0.5 : 1,
                WebkitTapHighlightColor: 'transparent',
                transition: 'opacity 150ms ease',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 2 }}>
                Annual
                {loading === 'annual' && <Spinner />}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>€79/year</div>
              <div style={{ fontSize: 10, color: 'var(--color-success)', marginTop: 2, fontWeight: 500 }}>Save 34%</div>
            </button>
          </div>

          <p style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center', margin: 0 }}>
            14-day free trial · Cancel any time
          </p>
        </div>
      </div>
    </>
  )
}
