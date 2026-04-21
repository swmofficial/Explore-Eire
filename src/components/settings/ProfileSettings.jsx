import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import useUserStore from '../../store/userStore'
import EmailChangeModal from '../EmailChangeModal'

function PersonIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="11" r="5.5" stroke="var(--color-muted)" strokeWidth="1.8"/>
      <path d="M4 28c0-5.523 5.373-10 12-10s12 4.477 12 10" stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function FieldInput({ label, value, onChange, type = 'text', readOnly = false, hint, action, onAction }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </div>
        {action && (
          <button
            onClick={onAction}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', padding: '2px 0', WebkitTapHighlightColor: 'transparent' }}
          >
            {action}
          </button>
        )}
      </div>
      {readOnly ? (
        <>
          <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>{value}</div>
          {hint && <div style={{ fontSize: 11, color: 'var(--color-border)', marginTop: 5 }}>{hint}</div>}
        </>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--color-accent)',
            color: 'var(--color-text)', fontSize: 15,
            padding: '4px 0 6px', outline: 'none', fontFamily: 'inherit',
          }}
        />
      )}
    </div>
  )
}

export default function ProfileSettings({ onBack }) {
  const { user, setUser } = useUserStore()
  const initialName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || ''
  const initialBio = user?.user_metadata?.bio || ''

  const [displayName, setDisplayName] = useState(initialName)
  const [bio, setBio] = useState(initialBio)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)

  const isDirty = displayName !== initialName || bio !== initialBio

  async function handleSave() {
    if (!isDirty) return
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase.auth.updateUser({
      data: { display_name: displayName, bio },
    })
    setSaving(false)
    if (err) {
      setError(err.message)
    } else if (data?.user) {
      setUser(data.user)
      onBack()
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: 'var(--color-base)', paddingBottom: 80 }}>
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
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Profile</span>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          style={{
            background: 'none', border: 'none', cursor: isDirty ? 'pointer' : 'default',
            fontSize: 15, fontWeight: 600,
            color: isDirty ? 'var(--color-accent)' : 'var(--color-border)',
            padding: 4,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 0 20px' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'var(--color-raised)', border: '2px solid var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PersonIcon size={40} />
        </div>
        <button
          onClick={() => console.log('[ProfileSettings] Change photo — Capacitor Camera to be wired')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: 14, fontWeight: 500, marginTop: 10, WebkitTapHighlightColor: 'transparent' }}
        >
          Change Photo
        </button>
      </div>

      {/* Form card */}
      <div style={{ margin: '0 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
        <FieldInput label="Display Name" value={displayName} onChange={setDisplayName} />
        <FieldInput
          label="Email"
          value={user?.email || ''}
          readOnly
          action="Change"
          onAction={() => setShowEmailModal(true)}
        />
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Bio
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="A short intro about yourself…"
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: '1px solid var(--color-accent)',
              color: 'var(--color-text)', fontSize: 14,
              padding: '4px 0 6px', outline: 'none', fontFamily: 'inherit',
              resize: 'none', lineHeight: 1.5,
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{ margin: '12px 16px 0', color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>
      )}

      {showEmailModal && (
        <EmailChangeModal onClose={() => setShowEmailModal(false)} />
      )}
    </div>
  )
}
