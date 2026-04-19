export default function SubscriptionCancel() {
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
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--color-primary)',
          marginBottom: 12,
        }}
      >
        No worries
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
        Your free access continues.
      </div>

      <button
        onClick={() => { window.location.href = '/' }}
        style={{
          padding: '15px 32px',
          borderRadius: 14,
          border: '1.5px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-primary)',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        Back to app
      </button>
    </div>
  )
}
