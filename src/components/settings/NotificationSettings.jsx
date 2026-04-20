import { useState } from 'react'

function Toggle({ on, onToggle }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        width: 46, height: 26, borderRadius: 13,
        background: on ? '#E8C96A' : '#3A3D6A',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 200ms ease',
        flexShrink: 0, WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: on ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#E8EAF0',
        transition: 'left 200ms ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

function ToggleRow({ label, subtitle, value, onToggle, noBorder }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px',
      borderBottom: noBorder ? 'none' : '1px solid #2E3250',
    }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#E8EAF0' }}>{label}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#6B6F8A', marginTop: 2 }}>{subtitle}</div>}
      </div>
      <Toggle on={value} onToggle={onToggle} />
    </div>
  )
}

export default function NotificationSettings({ onBack }) {
  const [pushEnabled, setPushEnabled] = useState(
    () => localStorage.getItem('ee_push_notifications') !== 'false'
  )
  const [emailEnabled, setEmailEnabled] = useState(
    () => localStorage.getItem('ee_email_digest') !== 'false'
  )

  function togglePush() {
    const next = !pushEnabled
    setPushEnabled(next)
    localStorage.setItem('ee_push_notifications', String(next))
  }

  function toggleEmail() {
    const next = !emailEnabled
    setEmailEnabled(next)
    localStorage.setItem('ee_email_digest', String(next))
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: '#1A1D2E', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px',
        borderBottom: '1px solid #2E3250',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#E8C96A', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#E8C96A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#E8EAF0' }}>Notifications</span>
        <div style={{ width: 28 }} />
      </div>

      {/* Settings card */}
      <div style={{ margin: '24px 16px 0', background: '#252840', border: '1px solid #2E3250', borderRadius: 14, overflow: 'hidden' }}>
        <ToggleRow
          label="Push Notifications"
          subtitle="Alerts and updates on your device"
          value={pushEnabled}
          onToggle={togglePush}
        />
        <ToggleRow
          label="Email Digest"
          subtitle="Weekly summary of activity"
          value={emailEnabled}
          onToggle={toggleEmail}
          noBorder
        />
      </div>

      <p style={{ margin: '14px 16px 0', fontSize: 13, color: '#6B6F8A', lineHeight: 1.5 }}>
        You can manage notification permissions in your device Settings app.
      </p>
    </div>
  )
}
