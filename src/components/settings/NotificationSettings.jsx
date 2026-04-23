import { useState, useEffect } from 'react'
import { getNotifPermission } from '../../hooks/useNotifications'
import useUserStore from '../../store/userStore'

const NOTIFICATION_TYPES = [
  { key: 'nearby_mineral',   label: 'Nearby Gold Locality',  subtitle: 'Alert when a gold locality is within 25km',              pro: false },
  { key: 'course_nudge',     label: 'Course Progress Nudge', subtitle: 'Reminder when you haven\'t visited Learning Hub in 5 days', pro: false },
  { key: 'reengagement',     label: 'Re-engagement Reminder', subtitle: 'Nudge if you\'ve been away for 7+ days',                  pro: false },
  { key: 'monthly_summary',  label: 'Monthly Summary',       subtitle: 'Distance + session stats at the start of each month',      pro: false },
  { key: 'new_course',       label: 'New Course Available',  subtitle: 'When a new course is added to the Learning Hub',           pro: false },
  { key: 'waypoint_revisit', label: 'Waypoint Reminder',     subtitle: 'Reminder to visit waypoints saved 7 days ago',             pro: false },
  { key: 'river_conditions', label: 'River Conditions Alert', subtitle: 'Low-flow conditions near your saved spots (Pro)',          pro: true  },
  { key: 'legal_reminder',   label: 'Land Access Reminder',  subtitle: 'One-time reminder after 5 sessions',                      pro: false },
]

const LS_PREFIX = 'ee_notif_type_'

function Toggle({ on, onToggle, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      disabled={disabled}
      style={{
        width: 46, height: 26, borderRadius: 13,
        background: on ? 'var(--color-accent)' : 'var(--color-raised)',
        border: 'none', cursor: disabled ? 'default' : 'pointer', position: 'relative',
        transition: 'background 200ms ease',
        flexShrink: 0, WebkitTapHighlightColor: 'transparent',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: 'var(--color-text)',
        transition: 'left 200ms ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

export default function NotificationSettings({ onBack }) {
  const { isPro } = useUserStore()
  const [permission, setPermission] = useState(getNotifPermission)
  const [masterEnabled, setMasterEnabled] = useState(
    () => localStorage.getItem('ee_push_notifications') !== 'false'
  )
  const [typeToggles, setTypeToggles] = useState(() => {
    const defaults = {}
    NOTIFICATION_TYPES.forEach(t => {
      defaults[t.key] = localStorage.getItem(`${LS_PREFIX}${t.key}`) !== 'false'
    })
    return defaults
  })

  async function requestPermission() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      setMasterEnabled(true)
      localStorage.setItem('ee_push_notifications', 'true')
      localStorage.setItem('ee_notif_asked', 'true')
    }
  }

  function toggleMaster() {
    const next = !masterEnabled
    setMasterEnabled(next)
    localStorage.setItem('ee_push_notifications', String(next))
    if (next && permission === 'default') {
      requestPermission()
    }
  }

  function toggleType(key) {
    setTypeToggles(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(`${LS_PREFIX}${key}`, String(next[key]))
      return next
    })
  }

  const permissionDenied = permission === 'denied'

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: 'var(--color-base)', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-accent)', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Notifications</span>
        <div style={{ width: 28 }} />
      </div>

      {/* Permission denied banner */}
      {permissionDenied && (
        <div style={{ margin: '16px 16px 0', background: 'rgba(232,75,75,0.1)', border: '1px solid rgba(232,75,75,0.3)', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ fontSize: 13, color: 'var(--color-danger)', lineHeight: 1.5, margin: 0 }}>
            Notifications are blocked in your browser settings. To enable them, go to your browser or device settings and allow notifications for this site.
          </p>
        </div>
      )}

      {/* Permission not yet requested */}
      {permission === 'default' && (
        <div style={{ margin: '16px 16px 0', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            Enable notifications to get gold locality alerts, course reminders, and session summaries.
          </p>
          <button
            onClick={requestPermission}
            style={{ background: 'var(--color-accent)', color: '#0A0A0A', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Enable Notifications
          </button>
        </div>
      )}

      {/* Master toggle */}
      <div style={{ margin: '16px 16px 0', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Push Notifications</div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>Master switch for all alerts</div>
          </div>
          <Toggle on={masterEnabled && !permissionDenied} onToggle={toggleMaster} disabled={permissionDenied} />
        </div>
      </div>

      {/* Individual types */}
      <div style={{ margin: '16px 16px 0', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
        {NOTIFICATION_TYPES.map((type, i) => {
          const isDisabled = !masterEnabled || permissionDenied || (type.pro && !isPro)
          const isOn = typeToggles[type.key] && !isDisabled
          return (
            <div
              key={type.key}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px',
                borderBottom: i < NOTIFICATION_TYPES.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <div style={{ flex: 1, marginRight: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: isDisabled ? 'var(--color-muted)' : 'var(--color-text)' }}>
                    {type.label}
                  </span>
                  {type.pro && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gold-500)', background: 'var(--overlay-pro-bg)', borderRadius: 4, padding: '1px 5px' }}>
                      PRO
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2, lineHeight: 1.4 }}>{type.subtitle}</div>
              </div>
              <Toggle
                on={isOn}
                onToggle={() => !isDisabled && toggleType(type.key)}
                disabled={isDisabled}
              />
            </div>
          )
        })}
      </div>

      <p style={{ margin: '14px 16px 0', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>
        You can also manage notification permissions in your device Settings app.
      </p>
    </div>
  )
}
