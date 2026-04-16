// useGeolocation.js — Device GPS via @capacitor/geolocation.
// On native iOS/Android: uses the Capacitor Geolocation plugin for better accuracy
// and proper permission handling (iOS "Always" / "When In Use" prompts).
// On web: falls back to navigator.geolocation via the Capacitor web implementation.
// NOTE: GPS always comes from Geolocation API — never from EXIF.
import { useState, useEffect, useRef } from 'react'
import { Geolocation } from '@capacitor/geolocation'

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const [permissionState, setPermissionState] = useState(null)
  const watchIdRef = useRef(null)

  async function getCurrentPosition() {
    return Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
  }

  async function startWatching(callback) {
    if (watchIdRef.current !== null) return
    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true, maximumAge: 5000 },
      (pos, err) => {
        if (err) { setError(err); return }
        if (pos) {
          setPosition(pos)
          if (callback) callback(pos)
        }
      },
    )
    watchIdRef.current = id
  }

  function stopWatching() {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch({ id: watchIdRef.current })
      watchIdRef.current = null
    }
  }

  useEffect(() => {
    return () => stopWatching()
  }, [])

  return { position, error, permissionState, getCurrentPosition, startWatching, stopWatching }
}
