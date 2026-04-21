// EmailChangeModal — 3-step email change with client-side old-email gate.
// Step 1: confirm current email (client-side match only)
// Step 2: enter + confirm new email
// Step 3: success screen (Supabase sends confirmation links to both addresses)
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

function Field({ label, type = 'text', value, onChange, error, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', marginBottom: 6, letterSpacing: '0.02em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: '100%', padding: '11px 14px',
          background: 'var(--color-surface)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          borderRadius: 8, fontSize: 14,
          color: 'var(--color-text)', outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
      {error && <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  )
}

export default function EmailChangeModal({ onClose }) {
  const { user } = useUserStore()
  const [step, setStep] = useState(1)
  const [oldEmail, setOldEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleStep1() {
    if (!oldEmail) { setError('Please enter your current email address.'); return }
    const currentEmail = user?.email || ''
    if (oldEmail.trim().toLowerCase() !== currentEmail.toLowerCase()) {
      setError("That doesn't match the email on your account.")
      return
    }
    setError(null)
    setStep(2)
  }

  async function handleStep2() {
    if (!newEmail) { setError('Please enter a new email address.'); return }
    if (newEmail !== confirmEmail) { setError('Email addresses do not match.'); return }
    if (newEmail.toLowerCase() === (user?.email || '').toLowerCase()) {
      setError('New email must be different from your current email.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ email: newEmail })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep(3)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, animation: 'backdropFadeIn 200ms ease-out' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201, width: 'min(92vw, 400px)',
        background: 'var(--color-base)',
        border: '1px solid var(--color-border)',
        borderRadius: 16, padding: '24px 24px 20px',
        animation: 'overlayFadeIn 200ms ease-out',
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 4, display: 'flex', borderRadius: 6, WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Title */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
          {step === 3 ? 'Check your inbox' : 'Change Email'}
        </h2>

        {/* Step indicators */}
        {step < 3 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
            {[1, 2].map(s => (
              <div key={s} style={{ height: 3, flex: 1, borderRadius: 2, background: s <= step ? 'var(--color-accent)' : 'var(--color-border)', transition: 'background 200ms' }} />
            ))}
          </div>
        )}

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              Enter your current email address to continue.
            </p>
            <Field
              label="Current email address"
              type="email"
              value={oldEmail}
              onChange={setOldEmail}
              error={error}
              placeholder="you@example.com"
            />
            <button
              onClick={handleStep1}
              style={{ width: '100%', padding: '12px', background: 'var(--color-accent)', color: '#0A0A0A', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Continue
            </button>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              Enter your new email address. Supabase will send confirmation links to both your old and new addresses.
            </p>
            <Field label="New email address" type="email" value={newEmail} onChange={v => { setNewEmail(v); setError(null) }} placeholder="new@example.com" />
            <Field label="Confirm new email address" type="email" value={confirmEmail} onChange={v => { setConfirmEmail(v); setError(null) }} error={error} placeholder="new@example.com" />
            <button
              onClick={handleStep2}
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? 'var(--color-border)' : 'var(--color-accent)', color: loading ? 'var(--color-muted)' : '#0A0A0A', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}
            >
              {loading ? 'Sending…' : 'Send Confirmation'}
            </button>
          </>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <>
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(75,232,122,0.14)', border: '1px solid var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                We've sent confirmation links to both your <strong style={{ color: 'var(--color-text)' }}>old</strong> and <strong style={{ color: 'var(--color-text)' }}>new</strong> email addresses. You must click both links to complete the change.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ width: '100%', padding: '12px', background: 'var(--color-accent)', color: '#0A0A0A', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </>
  )
}
