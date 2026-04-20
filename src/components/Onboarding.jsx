// Onboarding.jsx — spotlight / coach-marks tour
// Screen 1: full-screen welcome splash (opaque)
// Steps 2–6: transparent overlay with spotlight cutout + tooltip card
// Screen 7: full-screen location permission (opaque)
import { useState, useEffect } from 'react'

const SPOTLIGHT_PAD = 10
const ARROW_H = 14
const TOOLTIP_W = 280
const TOOLTIP_H_EST = 170   // conservative estimate; avoids overlap when placing above
const EDGE_PAD = 14

// Steps referencing CategoryHeader IDs (tour-home-btn, tour-learn-tab, tour-mine-tab)
// have been removed — CategoryHeader replaced by BottomNav in UX overhaul.
const COACH_STEPS = [
  {
    targetId: 'tour-layers-btn',
    title: 'Map layers',
    body: 'Toggle GSI gold sample data, satellite imagery, terrain overlays and more — all sourced from official Irish datasets.',
  },
  {
    targetId: 'tour-camera-btn',
    title: 'Quick capture',
    body: "Drop a waypoint on the map or log a find instantly — without leaving what you're doing.",
  },
]

// Given the bounding rect of the target element, compute positions for the
// spotlight div, tooltip card, and arrow direction + offset.
function computeLayout(rect) {
  const W = window.innerWidth
  const H = window.innerHeight

  const spotlight = {
    left: rect.left - SPOTLIGHT_PAD,
    top: rect.top - SPOTLIGHT_PAD,
    width: rect.width + SPOTLIGHT_PAD * 2,
    height: rect.height + SPOTLIGHT_PAD * 2,
  }

  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  // Place tooltip below when the target is in the upper 55% of the screen
  const placeBelow = cy < H * 0.55

  // Horizontal: centre tooltip on the spotlight, clamp to screen edges
  let tLeft = cx - TOOLTIP_W / 2
  tLeft = Math.max(EDGE_PAD, Math.min(tLeft, W - TOOLTIP_W - EDGE_PAD))

  // Vertical: leave ARROW_H gap between spotlight edge and arrow tip
  const tTop = placeBelow
    ? spotlight.top + spotlight.height + ARROW_H + 4
    : spotlight.top - TOOLTIP_H_EST - ARROW_H - 4

  // Arrow horizontal anchor (relative to tooltip left edge), clamped away from corners
  const arrowX = Math.max(20, Math.min(cx - tLeft, TOOLTIP_W - 20))

  return {
    spotlight,
    tooltip: { left: tLeft, top: tTop },
    arrow: { dir: placeBelow ? 'up' : 'down', x: arrowX },
  }
}

// ── Shared primitives ──────────────────────────────────────────────

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

// ── Screen 1: Welcome splash ───────────────────────────────────────

function Welcome({ onNext }) {
  return (
    <Screen>
      <div />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#E8C96A', letterSpacing: '-0.02em' }}>
          Explore Eire
        </div>
        <div style={{ fontSize: 18, fontWeight: 400, color: '#9CA3AF' }}>
          Ireland's outdoors. One app.
        </div>
        <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, maxWidth: 280 }}>
          The first platform built for the Irish outdoor enthusiast — gold prospecting, hiking, fishing, surfing and more.
        </div>
      </div>
      <div style={{ width: '100%' }}>
        <GoldBtn onClick={onNext}>Next →</GoldBtn>
      </div>
    </Screen>
  )
}

// ── Screen 7: Location permission ─────────────────────────────────

function Permissions({ onComplete }) {
  function requestAndContinue() {
    navigator.geolocation.getCurrentPosition(() => {}, () => {})
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
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path
            d="M24 4C16.268 4 10 10.268 10 18c0 10.5 14 26 14 26s14-15.5 14-26c0-7.732-6.268-14-14-14z"
            stroke="#E8C96A"
            strokeWidth="2"
            fill="rgba(232,201,106,0.12)"
          />
          <circle cx="24" cy="18" r="4" fill="#E8C96A" />
        </svg>
        <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.65, maxWidth: 280 }}>
          Explore Eire uses your location to show what's near you — gold samples, trails, and local conditions. We never share your location.
        </div>
      </div>
      <div style={{ width: '100%' }}>
        <GoldBtn onClick={requestAndContinue}>Allow location &amp; continue</GoldBtn>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostLink onClick={finish}>Skip for now</GhostLink>
        </div>
      </div>
    </Screen>
  )
}

// ── Coach mark overlay ─────────────────────────────────────────────
// Renders a spotlight cutout over the target element + a positioned tooltip card.
// The backdrop captures click-to-advance so users can tap anywhere to skip.

function CoachMark({ targetId, title, body, coachIndex, onNext }) {
  const [layout, setLayout] = useState(null)

  useEffect(() => {
    // rAF ensures the DOM has painted (map view mounts synchronously, but one
    // frame guarantees all absolute-positioned buttons are laid out)
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(targetId)
      if (el) setLayout(computeLayout(el.getBoundingClientRect()))
    })
    return () => cancelAnimationFrame(raf)
  }, [targetId])

  if (!layout) return null

  const { spotlight, tooltip, arrow } = layout
  const counter = coachIndex + 2  // Welcome counts as step 1; first coach mark = "2 of 6"

  return (
    <>
      {/* Full-screen transparent backdrop — click anywhere to advance */}
      <div
        onClick={onNext}
        style={{ position: 'fixed', inset: 0, zIndex: 100, cursor: 'pointer' }}
      />

      {/* Spotlight — no background fill, box-shadow creates the dark overlay outside */}
      <div
        style={{
          position: 'fixed',
          left: spotlight.left,
          top: spotlight.top,
          width: spotlight.width,
          height: spotlight.height,
          borderRadius: 12,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
          pointerEvents: 'none',
          zIndex: 101,
        }}
      />

      {/* Tooltip card */}
      <div
        style={{
          position: 'fixed',
          left: tooltip.left,
          top: tooltip.top,
          width: TOOLTIP_W,
          background: '#1C1D21',
          border: '1px solid rgba(232,201,106,0.2)',
          borderRadius: 14,
          padding: '16px 16px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 102,
          overflow: 'visible',
        }}
      >
        {/* Gold arrow — floats outside the card on whichever edge faces the spotlight */}
        {arrow.dir === 'up' ? (
          <div style={{ position: 'absolute', top: -ARROW_H, left: arrow.x - 10, pointerEvents: 'none' }}>
            <svg width="20" height={ARROW_H} viewBox={`0 0 20 ${ARROW_H}`}>
              <path d={`M10 0 L20 ${ARROW_H} L0 ${ARROW_H} Z`} fill="#E8C96A" />
            </svg>
          </div>
        ) : (
          <div style={{ position: 'absolute', bottom: -ARROW_H, left: arrow.x - 10, pointerEvents: 'none' }}>
            <svg width="20" height={ARROW_H} viewBox={`0 0 20 ${ARROW_H}`}>
              <path d={`M10 ${ARROW_H} L20 0 L0 0 Z`} fill="#E8C96A" />
            </svg>
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 8, letterSpacing: '0.04em' }}>
          {counter} of {COACH_STEPS.length + 1}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#E8EAF0', marginBottom: 6, lineHeight: 1.3 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.55, marginBottom: 14 }}>
          {body}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onNext() }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '10px 20px',
            borderRadius: 20,
            border: 'none',
            background: '#E8C96A',
            color: '#0A0A0A',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {coachIndex < COACH_STEPS.length - 1 ? 'Next →' : 'Almost done →'}
        </button>
      </div>
    </>
  )
}

// ── Root ───────────────────────────────────────────────────────────
// step: 0 = welcome, 1–5 = coach marks, 6 = permissions

export default function Onboarding({ onComplete, onEnterTour }) {
  const [step, setStep] = useState(0)

  function advance() {
    setStep((s) => s + 1)
  }

  function handleWelcomeNext() {
    onEnterTour?.()   // switch app to map view so coach mark targets are in the DOM
    advance()
  }

  function handleComplete() {
    localStorage.setItem('ee_onboarded', 'true')
    onComplete()
  }

  if (step === 0) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0A0A0A', zIndex: 100 }}>
        <Welcome onNext={handleWelcomeNext} />
      </div>
    )
  }

  if (step === COACH_STEPS.length + 1) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0A0A0A', zIndex: 100 }}>
        <Permissions onComplete={handleComplete} />
      </div>
    )
  }

  const coachIndex = step - 1
  const coach = COACH_STEPS[coachIndex]

  return (
    <CoachMark
      key={coach.targetId}
      targetId={coach.targetId}
      title={coach.title}
      body={coach.body}
      coachIndex={coachIndex}
      onNext={advance}
    />
  )
}
