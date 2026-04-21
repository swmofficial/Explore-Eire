// AuthModal.jsx — Sign In / Sign Up modal with Google OAuth, email/password,
// and a "Continue as guest" link that grants limited (t6/t7) access.
// Reads defaultTab and onSuccess callback from userStore so callers can control
// which tab opens and receive a callback after auth completes.
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

// ── Google logo SVG ────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

// ── Input field ────────────────────────────────────────────────────
function Field({ label, type, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', marginBottom: 6, letterSpacing: '0.02em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'current-password' : type}
        style={{
          width: '100%', padding: '11px 14px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8, fontSize: 14,
          color: 'var(--color-primary)',
          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────
export default function AuthModal() {
  const {
    showAuthModal, setShowAuthModal,
    setIsGuest,
    authModalDefaultTab,
    setAuthModalDefaultTab,
    authModalOnSuccess,
    setAuthModalOnSuccess,
  } = useUserStore()

  const [tab, setTab]           = useState(authModalDefaultTab ?? 'signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)

  // Sync tab when defaultTab changes (e.g. CTA opens with 'signup')
  useEffect(() => {
    if (showAuthModal) setTab(authModalDefaultTab ?? 'signin')
  }, [showAuthModal, authModalDefaultTab])

  if (!showAuthModal) return null

  function resetForm() {
    setEmail('')
    setPassword('')
    setError(null)
    setSuccess(null)
    setLoading(false)
  }

  function switchTab(t) {
    setTab(t)
    resetForm()
  }

  function handleClose() {
    resetForm()
    setShowAuthModal(false)
    setAuthModalDefaultTab('signin')
    setAuthModalOnSuccess(null)
  }

  function fireOnSuccess() {
    try {
      if (typeof authModalOnSuccess === 'function') authModalOnSuccess()
    } catch (_) {}
    setAuthModalOnSuccess(null)
  }

  async function handleGoogleOAuth() {
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (err) setError(err.message)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password })
        if (err) { setError(err.message); return }
        setSuccess('Check your email to confirm your account.')
        fireOnSuccess()
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) { setError(err.message); return }
        fireOnSuccess()
        handleClose()
      }
    } finally {
      setLoading(false)
    }
  }

  function handleGuest() {
    setIsGuest(true)
    handleClose()
  }

  const isSignUp = tab === 'signup'

  return (
    <>
      {/* Backdrop */}
      <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 49, animation: 'backdropFadeIn 200ms ease-out' }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50, width: 'min(92vw, 400px)',
        background: 'var(--color-base)',
        border: '1px solid var(--color-border)',
        borderRadius: 16, padding: '24px 24px 20px',
        animation: 'overlayFadeIn 200ms ease-out',
      }}>
        {/* Close */}
        <button
          onClick={handleClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Wordmark */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
            Explore Eire
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--color-surface)', borderRadius: 10, padding: 3, marginBottom: 20 }}>
          {['signin', 'signup'].map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: tab === t ? 'var(--color-base)' : 'transparent',
                color: tab === t ? 'var(--color-primary)' : 'var(--color-muted)',
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                transition: 'background 150ms ease, color 150ms ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {t === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleOAuth}
          style={{
            width: '100%', padding: '11px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 9, fontSize: 14, fontWeight: 600,
            color: 'var(--color-primary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginBottom: 16, WebkitTapHighlightColor: 'transparent',
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        {/* Email / password form */}
        <form onSubmit={handleSubmit}>
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSignUp ? 'Min 6 characters' : '••••••••'} />

          {error && <p style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 12, lineHeight: 1.4 }}>{error}</p>}
          {success && <p style={{ fontSize: 13, color: 'var(--color-success)', marginBottom: 12, lineHeight: 1.4 }}>{success}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '12px',
              background: loading || !email || !password ? 'var(--color-border)' : 'var(--color-accent)',
              color: loading || !email || !password ? 'var(--color-muted)' : '#0A0A0A',
              border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {/* Continue as guest */}
        <button
          onClick={handleGuest}
          style={{
            display: 'block', width: '100%', marginTop: 16, padding: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-muted)', textAlign: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Continue as guest
          <span style={{ display: 'block', fontSize: 11, marginTop: 2, color: 'var(--color-border)' }}>
            Limited data · No waypoints · No Pro layers
          </span>
        </button>
      </div>
    </>
  )
}
