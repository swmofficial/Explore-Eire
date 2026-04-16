// haptics.js — Haptic feedback via @capacitor/haptics.
// On native iOS/Android: triggers real haptic motor feedback.
// On web: falls back to navigator.vibrate() via the Capacitor web implementation.
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export async function triggerHaptic(style = 'light') {
  const impactStyle =
    style === 'heavy'  ? ImpactStyle.Heavy  :
    style === 'medium' ? ImpactStyle.Medium :
    ImpactStyle.Light
  try {
    await Haptics.impact({ style: impactStyle })
  } catch { /* silent — vibration not available on this platform */ }
}
