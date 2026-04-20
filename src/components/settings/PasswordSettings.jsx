import { useState } from 'react'
import { supabase } from '../../lib/supabase'

function PasswordField({ label, value, onChange }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #2E3250' }}>
      <div style={{
        fontSize: 11, fontWeight: 500, color: '#6B6F8A',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
      }}>
        {label}
      </div>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        style={{
          width: '100%', background: 'transparent', border: 'none',
          borderBottom: '1px solid #E8C96A', color: '#E8EAF0',
          fontSize: 15, padding: '4px 0 6px', outline: 'none', fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

export default function PasswordSettings({ onBack }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const mismatch = next && confirm && next !== confirm

  async function handleSave() {
    if (!next || !confirm) return
    if (mismatch) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    const { error: err } = await supabase.auth.updateUser({ password: next })
    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      setCurrent('')
      setNext('')
      setConfirm('')
    }
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
        <span style={{ fontSize: 18, fontWeight: 700, color: '#E8EAF0' }}>Password</span>
        <div style={{ width: 28 }} />
      </div>

      {/* Form card */}
      <div style={{ margin: '24px 16px 0', background: '#252840', border: '1px solid #2E3250', borderRadius: 14, overflow: 'hidden' }}>
        <PasswordField label="Current Password" value={current} onChange={setCurrent} />
        <PasswordField label="New Password" value={next} onChange={setNext} />
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#6B6F8A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Confirm New Password
          </div>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: `1px solid ${mismatch ? '#E84B4B' : '#E8C96A'}`,
              color: '#E8EAF0', fontSize: 15, padding: '4px 0 6px', outline: 'none', fontFamily: 'inherit',
            }}
          />
          {mismatch && (
            <div style={{ fontSize: 12, color: '#E84B4B', marginTop: 6 }}>Passwords do not match</div>
          )}
        </div>
      </div>

      {error && <div style={{ margin: '12px 16px 0', color: '#E84B4B', fontSize: 13 }}>{error}</div>}
      {success && <div style={{ margin: '12px 16px 0', color: '#4BE87A', fontSize: 13 }}>Password updated successfully.</div>}

      <button
        onClick={handleSave}
        disabled={!next || !confirm || !!mismatch || saving}
        style={{
          display: 'block', width: 'calc(100% - 32px)', margin: '20px 16px 0',
          background: next && confirm && !mismatch ? '#E8C96A' : '#3A3D6A',
          color: next && confirm && !mismatch ? '#1A1D2E' : '#6B6F8A',
          border: 'none', borderRadius: 12, padding: 16,
          fontSize: 16, fontWeight: 700, cursor: next && confirm && !mismatch ? 'pointer' : 'default',
          fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
        }}
      >
        {saving ? 'Updating…' : 'Update Password'}
      </button>
    </div>
  )
}
