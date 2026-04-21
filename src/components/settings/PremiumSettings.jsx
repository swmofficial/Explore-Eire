import useUserStore from '../../store/userStore'

const FEATURES = [
  'All geological map layers',
  'Unlimited GPS tracking',
  'Full course library',
  'Offline maps',
]

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="rgba(232,201,106,0.18)" stroke="var(--color-accent)" strokeWidth="1.2"/>
      <path d="M5 8l2 2 4-4" stroke="var(--color-accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function StarIcon({ size = 24, color = 'var(--color-base)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
        stroke={color} strokeWidth="1.6" strokeLinejoin="round" fill={`${color}33`}
      />
    </svg>
  )
}

function ChevronRight({ color = 'var(--color-muted)' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3l4 4-4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function PremiumSettings({ onBack }) {
  const { isPro, setShowUpgradeSheet } = useUserStore()

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: 'var(--color-base)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px',
        borderBottom: '1px solid #2E3250',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-accent)', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Premium</span>
        <div style={{ width: 28 }} />
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        {isPro ? (
          <>
            {/* Pro member card */}
            <div style={{
              background: 'var(--color-surface)', border: '1px solid #E8C96A',
              borderRadius: 16, padding: 20, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <StarIcon size={28} color="var(--color-accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 2 }}>Pro Member</div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>All features unlocked</div>
              </div>
            </div>

            {/* Manage subscription */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid #2E3250', borderRadius: 14, overflow: 'hidden' }}>
              <button
                onClick={() => console.log('[PremiumSettings] Manage subscription — Stripe customer portal to be wired')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px', background: 'none', border: 'none', cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>Manage Subscription</span>
                <ChevronRight color="var(--color-muted)" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Upgrade banner */}
            <div style={{
              background: 'linear-gradient(135deg, #B8860B, #E8C96A)',
              borderRadius: 16, padding: '22px 20px', marginBottom: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
            }}>
              <StarIcon size={32} color="var(--color-base)" />
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-base)' }}>Upgrade to Pro</div>
              <div style={{ fontSize: 14, color: '#2A2000', lineHeight: 1.45 }}>
                Everything you need to explore Ireland's outdoors
              </div>
            </div>

            {/* Feature list */}
            <div style={{ marginBottom: 24 }}>
              {FEATURES.map((f) => (
                <div key={f} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid #2E3250',
                }}>
                  <CheckIcon />
                  <span style={{ fontSize: 15, color: 'var(--color-text)' }}>{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowUpgradeSheet(true)}
              style={{
                width: '100%', background: 'var(--color-accent)', color: 'var(--color-base)',
                border: 'none', borderRadius: 14, padding: '16px 0',
                fontSize: 17, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                boxShadow: '0 4px 16px rgba(232,201,106,0.3)',
              }}
            >
              Upgrade to Pro
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-muted)', marginTop: 12 }}>
              €9.99/month · Cancel any time
            </p>
          </>
        )}
      </div>
    </div>
  )
}
