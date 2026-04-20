import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import useUserStore from '../../store/userStore'

function PersonIcon({ size = 32, color = '#6B6F8A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="11" r="5.5" stroke={color} strokeWidth="1.8"/>
      <path d="M4 28c0-5.523 5.373-10 12-10s12 4.477 12 10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function FieldInput({ label, value, onChange, type = 'text', readOnly = false, hint }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #2E3250' }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: '#6B6F8A',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
      }}>
        {label}
      </div>
      {readOnly ? (
        <>
          <div style={{ fontSize: 14, color: '#6B6F8A' }}>{value}</div>
          {hint && <div style={{ fontSize: 11, color: '#4A4D6A', marginTop: 5 }}>{hint}</div>}
        </>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid #E8C96A',
            color: '#E8EAF0',
            fontSize: 15,
            padding: '4px 0 6px',
            outline: 'none',
            fontFamily: 'inherit',
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
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: '#1A1D2E', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px',
        borderBottom: '1px solid #2E3250',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#E8C96A', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#E8C96A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#E8EAF0' }}>Profile</span>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          style={{
            background: 'none', border: 'none', cursor: isDirty ? 'pointer' : 'default',
            fontSize: 15, fontWeight: 600,
            color: isDirty ? '#E8C96A' : '#4A4D6A',
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
          background: '#3A3D6A', border: '2px solid #E8C96A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PersonIcon size={40} color="#6B6F8A" />
        </div>
        <button
          onClick={() => console.log('[ProfileSettings] Change photo — Capacitor Camera to be wired')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#E8C96A', fontSize: 14, fontWeight: 500, marginTop: 10,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Change Photo
        </button>
      </div>

      {/* Form card */}
      <div style={{ margin: '0 16px', background: '#252840', border: '1px solid #2E3250', borderRadius: 14, overflow: 'hidden' }}>
        <FieldInput label="Display Name" value={displayName} onChange={setDisplayName} />
        <FieldInput
          label="Email"
          value={user?.email || ''}
          readOnly
          hint="Contact support to change your email address"
        />
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#6B6F8A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Bio
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="A short intro about yourself…"
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: '1px solid #E8C96A', color: '#E8EAF0', fontSize: 14,
              padding: '4px 0 6px', outline: 'none', fontFamily: 'inherit',
              resize: 'none', lineHeight: 1.5,
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{ margin: '12px 16px 0', color: '#E84B4B', fontSize: 13 }}>{error}</div>
      )}
    </div>
  )
}
