// UpgradeSheet.jsx — Paywall bottom sheet.
// Opens when userStore.showUpgradeSheet === true.
import { useState } from 'react'
import useUserStore from '../store/userStore'

const FEATURES = [
  'All 5 modules unlocked',
  'Full gold data — all 7 tiers',
  'GSI geology and geochemistry layers',
  'Unlimited waypoints and photos',
  'Offline map downloads',
  'GPS route tracking',
  '3D terrain',
]

export default function UpgradeSheet() {
  const { showUpgradeSheet, setShowUpgradeSheet } = useUserStore()
  const [plan, setPlan] = useState('annual')

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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingBottom: 10,
                }}
              >
                <span style={{ color: '#E8C96A', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 14, color: 'var(--color-primary)' }}>{feature}</span>
              </div>
            ))}
          </div>

          {/* Price pills */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button
              onClick={() => setPlan('monthly')}
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: 10,
                border: `1.5px solid ${plan === 'monthly' ? '#E8C96A' : 'var(--color-border)'}`,
                background: plan === 'monthly' ? 'rgba(232,201,106,0.08)' : 'var(--color-raised)',
                cursor: 'pointer',
                textAlign: 'center',
                WebkitTapHighlightColor: 'transparent',
                transition: 'border-color 150ms ease',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: plan === 'monthly' ? '#E8C96A' : 'var(--color-primary)', marginBottom: 2 }}>
                Monthly
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>€9.99/month</div>
            </button>

            <button
              onClick={() => setPlan('annual')}
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: 10,
                border: `1.5px solid ${plan === 'annual' ? '#E8C96A' : 'var(--color-border)'}`,
                background: plan === 'annual' ? 'rgba(232,201,106,0.08)' : 'var(--color-raised)',
                cursor: 'pointer',
                textAlign: 'center',
                WebkitTapHighlightColor: 'transparent',
                transition: 'border-color 150ms ease',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: plan === 'annual' ? '#E8C96A' : 'var(--color-primary)', marginBottom: 2 }}>
                Annual
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>€79/year</div>
              <div style={{ fontSize: 10, color: '#4BE87A', marginTop: 2, fontWeight: 500 }}>Save 34%</div>
            </button>
          </div>

          {/* CTA button */}
          <button
            onClick={() => console.log('Stripe TODO')}
            style={{
              width: '100%',
              height: 52,
              background: '#E8C96A',
              color: '#0A0A0A',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Start free trial
          </button>

          {/* Sub-label */}
          <p style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
            14-day free trial · Cancel any time
          </p>
        </div>
      </div>
    </>
  )
}
