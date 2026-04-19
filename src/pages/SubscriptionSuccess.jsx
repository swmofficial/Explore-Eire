import { useEffect } from 'react'
import { useSubscription } from '../hooks/useSubscription'

export default function SubscriptionSuccess() {
  const { refresh } = useSubscription()

  // Refresh subscription status so isPro is set before user navigates back
  useEffect(() => { refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-base)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 32px',
        textAlign: 'center',
      }}
    >
      {/* Gold checkmark */}
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        style={{ marginBottom: 24 }}
      >
        <circle cx="24" cy="24" r="23" stroke="#E8C96A" strokeWidth="2" />
        <path
          d="M14 24l7 7 13-14"
          stroke="#E8C96A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#E8C96A',
          marginBottom: 12,
        }}
      >
        You're now an Explorer
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 400,
          color: 'var(--color-muted)',
          marginBottom: 40,
          lineHeight: 1.5,
        }}
      >
        All modules are now unlocked.
      </div>

      <button
        onClick={() => { window.location.href = '/' }}
        style={{
          padding: '15px 32px',
          borderRadius: 14,
          border: 'none',
          background: '#E8C96A',
          color: '#0A0A0A',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Start exploring →
      </button>
    </div>
  )
}
