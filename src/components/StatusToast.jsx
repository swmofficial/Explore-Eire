// StatusToast.jsx — Animated toast notification system.
//
// Toasts appear at top-centre (below CategoryHeader in map view).
// Each toast slides down in 180ms, holds, then slides up out 180ms before removal.
// Persistent OFFLINE toast (duration=0) stays until manually removed.
// Monitors navigator.onLine — fires offline/online toasts automatically.
import { useState, useEffect, useRef } from 'react'
import useMapStore from '../store/mapStore'

// ── Colour palette by type ───────────────────────────────────────────
const COLORS = {
  success: { bg: 'rgba(75,232,122,0.15)',  border: 'rgba(75,232,122,0.4)',  text: '#4BE87A' },
  error:   { bg: 'rgba(232,75,75,0.15)',   border: 'rgba(232,75,75,0.4)',   text: '#E84B4B' },
  warning: { bg: 'rgba(232,168,75,0.15)',  border: 'rgba(232,168,75,0.4)', text: '#E8A84B' },
  info:    { bg: 'rgba(75,139,232,0.15)',  border: 'rgba(75,139,232,0.4)', text: '#4B8BE8' },
  offline: { bg: 'rgba(255,68,68,0.2)',    border: 'rgba(255,68,68,0.5)',  text: '#FF4444' },
}

// ── Single toast pill ────────────────────────────────────────────────
function ToastPill({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false)
  const removeRef = useRef(onRemove)
  removeRef.current = onRemove

  useEffect(() => {
    if (toast.duration === 0) return // persistent — never auto-dismiss
    const exitAt   = toast.duration
    const removeAt = toast.duration + 180
    const exitTimer   = setTimeout(() => setExiting(true), exitAt)
    const removeTimer = setTimeout(() => removeRef.current(toast.id), removeAt)
    return () => { clearTimeout(exitTimer); clearTimeout(removeTimer) }
  }, [toast.id, toast.duration])

  const c = COLORS[toast.type] ?? COLORS.info

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 20,
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontSize: 13,
        fontWeight: 500,
        color: c.text,
        whiteSpace: 'nowrap',
        animation: exiting
          ? 'toastSlideUp 180ms ease-out forwards'
          : 'toastSlideDown 180ms ease-out',
        // Persistent offline toast is tappable (to dismiss manually on desktop)
        pointerEvents: toast.duration === 0 ? 'auto' : 'none',
        cursor: toast.duration === 0 ? 'pointer' : 'default',
      }}
      onClick={toast.duration === 0 ? () => onRemove(toast.id) : undefined}
    >
      {/* Offline dot */}
      {toast.type === 'offline' && (
        <div
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#FF4444', flexShrink: 0,
          }}
        />
      )}
      {toast.message}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────
export default function StatusToast() {
  const { toasts, addToast, removeToast } = useMapStore()

  // Monitor network connectivity
  useEffect(() => {
    let offlineToastId = null

    function handleOffline() {
      offlineToastId = addToast({ message: 'Offline', type: 'offline', duration: 0 })
    }

    function handleOnline() {
      if (offlineToastId) {
        removeToast(offlineToastId)
        offlineToastId = null
      }
      addToast({ message: 'Back online', type: 'success', duration: 3000 })
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    // Check current state at mount
    if (!navigator.onLine) handleOffline()

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        // Sit below CategoryHeader (44px + safe top + gap)
        top: 'calc(env(safe-area-inset-top, 0px) + 44px + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastPill key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}
