import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import useUserStore from '../../store/userStore'

function PasswordField({ label, value, onChange, error }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </div>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        style={{
          width: '100%', background: 'transparent', border: 'none',
          borderBottom: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-accent)'}`,
          color: 'var(--color-text)', fontSize: 15,
          padding: '4px 0 6px', outline: 'none', fontFamily: 'inherit',
        }}
      />
      {error && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 5 }}>{error}</div>}
    </div>
  )
}

export default function PasswordSettings({ onBack }) {
  const { user } = useUserStore()
  const [step, setStep] = useState(1) // 1 = re-auth, 2 = new password
  const [currentPwd, setCurrentPwd] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const mismatch = next && confirm && next !== confirm
  const tooShort = next && next.length < 8

  async function handleReAuth() {
    if (!currentPwd) { setError('Please enter your current password.'); return }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: currentPwd,
    })
    setLoading(false)
    if (err) { setError('Incorrect password. Please try again.'); return }
    setStep(2)
    setCurrentPwd('')
  }

  async function handleUpdate() {
    if (!next || !confirm) return
    if (mismatch || tooShort) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    const { error: err } = await supabase.auth.updateUser({ password: next })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
    setTimeout(() => { setNext(''); setConfirm(''); setSuccess(false); onBack() }, 2000)
  }

  const canSubmitStep2 = next && confirm && !mismatch && !tooShort

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
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Password</span>
        <div style={{ width: 28 }} />
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 4, margin: '16px 16px 0' }}>
        {[1, 2].map(s => (
          <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: s <= step ? 'var(--color-accent)' : 'var(--color-border)', transition: 'background 200ms' }} />
        ))}
      </div>

      {/* ── Step 1: Re-auth ── */}
      {step === 1 && (
        <>
          <p style={{ margin: '16px 16px 0', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            Verify your identity before changing your password.
          </p>
          <div style={{ margin: '16px 16px 0', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
            <PasswordField label="Current Password" value={currentPwd} onChange={v => { setCurrentPwd(v); setError(null) }} error={error} />
          </div>
          <button
            onClick={handleReAuth}
            disabled={!currentPwd || loading}
            style={{
              display: 'block', width: 'calc(100% - 32px)', margin: '20px 16px 0',
              background: currentPwd && !loading ? 'var(--color-accent)' : 'var(--color-border)',
              color: currentPwd && !loading ? '#0A0A0A' : 'var(--color-muted)',
              border: 'none', borderRadius: 12, padding: 16,
              fontSize: 16, fontWeight: 700, cursor: currentPwd && !loading ? 'pointer' : 'default',
              fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? 'Verifying…' : 'Continue'}
          </button>
        </>
      )}

      {/* ── Step 2: New password ── */}
      {step === 2 && (
        <>
          <p style={{ margin: '16px 16px 0', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            Choose a new password. Minimum 8 characters.
          </p>
          <div style={{ margin: '16px 16px 0', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
            <PasswordField label="New Password" value={next} onChange={v => { setNext(v); setError(null) }} error={tooShort ? 'Must be at least 8 characters' : null} />
            <div style={{ borderBottom: 'none' }}>
              <PasswordField label="Confirm New Password" value={confirm} onChange={v => { setConfirm(v); setError(null) }} error={mismatch ? 'Passwords do not match' : null} />
            </div>
          </div>

          {error && <div style={{ margin: '12px 16px 0', color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>}
          {success && <div style={{ margin: '12px 16px 0', color: 'var(--color-success)', fontSize: 13 }}>Password updated successfully.</div>}

          <button
            onClick={handleUpdate}
            disabled={!canSubmitStep2 || loading}
            style={{
              display: 'block', width: 'calc(100% - 32px)', margin: '20px 16px 0',
              background: canSubmitStep2 && !loading ? 'var(--color-accent)' : 'var(--color-border)',
              color: canSubmitStep2 && !loading ? '#0A0A0A' : 'var(--color-muted)',
              border: 'none', borderRadius: 12, padding: 16,
              fontSize: 16, fontWeight: 700, cursor: canSubmitStep2 && !loading ? 'pointer' : 'default',
              fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </>
      )}
    </div>
  )
}
