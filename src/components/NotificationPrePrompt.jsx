// NotificationPrePrompt — contextual in-app prompt shown before the OS permission dialog.
// Rendered from App.jsx when userStore.showNotifPrePrompt is true.
import useUserStore from '../store/userStore'

export default function NotificationPrePrompt() {
  const { showNotifPrePrompt, setShowNotifPrePrompt } = useUserStore()

  if (!showNotifPrePrompt) return null

  async function handleEnable() {
    setShowNotifPrePrompt(false)
    localStorage.setItem('ee_notif_asked', 'true')
    if ('Notification' in window) {
      await Notification.requestPermission()
    }
  }

  function handleSnooze() {
    setShowNotifPrePrompt(false)
    localStorage.setItem('ee_notif_snooze', String(Date.now()))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleSnooze}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, animation: 'backdropFadeIn 200ms ease-out' }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 301,
        background: 'var(--color-base)',
        border: '1px solid var(--color-border)',
        borderRadius: '20px 20px 0 0',
        padding: '24px 24px calc(env(safe-area-inset-bottom, 0px) + 24px)',
        animation: 'slideUp 250ms cubic-bezier(0.32, 0.72, 0, 1)',
      }}>
        {/* Handle */}
        <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--color-border)', margin: '0 auto 20px' }} />

        {/* Bell icon */}
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(232,201,106,0.14)', border: '1px solid rgba(232,201,106,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 3a6 6 0 0 1 6 6v4.5l1.5 2H4.5L6 13.5V9a6 6 0 0 1 6-6z" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M9.75 20.25a2.25 2.25 0 0 0 4.5 0" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center', marginBottom: 8 }}>
          Stay in the loop
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
          Want to be notified when gold is spotted near you? Enable notifications to get real-time alerts.
        </p>

        <button
          onClick={handleEnable}
          style={{
            width: '100%', padding: '14px', background: 'var(--color-accent)', color: '#0A0A0A',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Enable Notifications
        </button>

        <button
          onClick={handleSnooze}
          style={{
            width: '100%', padding: '12px', background: 'transparent',
            color: 'var(--color-muted)', border: 'none',
            fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Not Now
        </button>
      </div>
    </>
  )
}
