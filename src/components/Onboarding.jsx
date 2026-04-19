import { useState } from 'react'
import { MODULES } from '../lib/moduleConfig'

const TOTAL = 3

// ── Shared layout shell ────────────────────────────────────────────

function Screen({ children }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        padding: 'calc(env(safe-area-inset-top, 0px) + 48px) 24px calc(env(safe-area-inset-bottom, 0px) + 40px)',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
}

function GoldBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px 0',
        borderRadius: 16,
        border: 'none',
        background: '#E8C96A',
        color: '#0A0A0A',
        fontSize: 17,
        fontWeight: 700,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

function GhostLink({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: '#6B7280',
        fontSize: 14,
        cursor: 'pointer',
        padding: '8px 0',
        marginTop: 4,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  )
}

function Dots({ current }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
      {Array.from({ length: TOTAL }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === current ? '#E8C96A' : 'rgba(255,255,255,0.15)',
            transition: 'width 250ms ease',
          }}
        />
      ))}
    </div>
  )
}

// ── Screen 1 — Welcome ─────────────────────────────────────────────

function Welcome({ onNext }) {
  return (
    <Screen>
      {/* Spacer to push content toward centre */}
      <div />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#E8C96A', letterSpacing: '-0.02em' }}>
          Explore Eire
        </div>
        <div style={{ fontSize: 18, fontWeight: 400, color: '#9CA3AF' }}>
          Ireland's outdoors. One app.
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#6B7280',
            lineHeight: 1.6,
            maxWidth: 280,
          }}
        >
          The first platform built for the Irish outdoor enthusiast — gold prospecting, hiking, fishing, surfing and more.
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <Dots current={0} />
        <GoldBtn onClick={onNext}>Next →</GoldBtn>
      </div>
    </Screen>
  )
}

// ── Screen 2 — Five Modules ────────────────────────────────────────

function FiveModules({ onNext, onSkip }) {
  return (
    <Screen>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#E8EAF0', letterSpacing: '-0.01em' }}>
        Five modules. One subscription.
      </div>

      <div style={{ width: '100%' }}>
        {/* Module icons row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '0 8px',
            marginBottom: 32,
          }}
        >
          {MODULES.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${m.accent}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                {m.icon}
              </div>
              <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', letterSpacing: '0.02em' }}>
                {m.shortLabel}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#E8C96A', marginBottom: 6 }}>
            Explorer — €9.99/month
          </div>
          <div style={{ fontSize: 13, fontWeight: 400, color: '#6B7280' }}>
            Annual — €79/year · save 34%
          </div>
        </div>

        <Dots current={1} />
        <GoldBtn onClick={onNext}>Next →</GoldBtn>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostLink onClick={onSkip}>Skip</GhostLink>
        </div>
      </div>
    </Screen>
  )
}

// ── Screen 3 — Permissions ─────────────────────────────────────────

function Permissions({ onComplete }) {
  function requestAndContinue() {
    navigator.geolocation.getCurrentPosition(
      () => {},   // granted — no-op, app uses its own GPS hooks
      () => {},   // denied — same outcome
    )
    finish()
  }

  function finish() {
    localStorage.setItem('ee_onboarded', 'true')
    onComplete()
  }

  return (
    <Screen>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#E8EAF0', letterSpacing: '-0.01em' }}>
        One permission to get started
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {/* Location pin SVG */}
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="M24 4C16.268 4 10 10.268 10 18c0 10.5 14 26 14 26s14-15.5 14-26c0-7.732-6.268-14-14-14z"
            stroke="#E8C96A"
            strokeWidth="2"
            fill="rgba(232,201,106,0.12)"
          />
          <circle cx="24" cy="18" r="4" fill="#E8C96A" />
        </svg>

        <div
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#6B7280',
            lineHeight: 1.65,
            maxWidth: 280,
          }}
        >
          Explore Eire uses your location to show what's near you — gold samples, trails, and local conditions. We never share your location.
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <Dots current={2} />
        <GoldBtn onClick={requestAndContinue}>Allow location &amp; continue</GoldBtn>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostLink onClick={finish}>Skip for now</GhostLink>
        </div>
      </div>
    </Screen>
  )
}

// ── Root component ─────────────────────────────────────────────────

export default function Onboarding({ onComplete }) {
  const [screen, setScreen] = useState(0)

  function handleComplete() {
    localStorage.setItem('ee_onboarded', 'true')
    onComplete()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0A0A0A',
        zIndex: 100,
      }}
    >
      {screen === 0 && <Welcome onNext={() => setScreen(1)} />}
      {screen === 1 && (
        <FiveModules
          onNext={() => setScreen(2)}
          onSkip={handleComplete}
        />
      )}
      {screen === 2 && <Permissions onComplete={handleComplete} />}
    </div>
  )
}
