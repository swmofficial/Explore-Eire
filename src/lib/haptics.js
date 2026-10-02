/**
 * Trigger a haptic feedback pulse on supported devices.
 * Falls back silently on desktop / unsupported browsers.
 *
 * @param {'light'|'medium'|'heavy'} style
 */
export function triggerHaptic(style = 'light') {
  // iOS / Android via Navigator.vibrate
  if (!navigator.vibrate) return
  const durations = { light: 10, medium: 20, heavy: 40 }
  navigator.vibrate(durations[style] ?? 10)
}
