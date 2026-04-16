// haptics.js — Haptic feedback abstraction.
// Web: uses navigator.vibrate(). Ready to swap for @capacitor/haptics in Session D.
export function triggerHaptic(style = 'light') {
  if (!('vibrate' in navigator)) return
  const ms = style === 'heavy' ? 50 : style === 'medium' ? 30 : 15
  try { navigator.vibrate(ms) } catch { /* silent — some browsers block in non-gesture context */ }
}
