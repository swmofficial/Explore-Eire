// haptics.js — Haptic feedback via @capacitor/haptics.
// On native iOS/Android: triggers real haptic motor feedback.
// On web: falls back to navigator.vibrate() via the Capacitor web implementation.
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export async function triggerHaptic(style = 'light') {
  try {
    const s = style.charAt(0).toUpperCase() + style.slice(1)
    await Haptics.impact({ style: ImpactStyle[s] ?? ImpactStyle.Light })
  } catch { /* silently fail on web */ }
}
