// useGeolocation.js — Device GPS via navigator.geolocation
// NOTE: GPS always comes from navigator.geolocation — never from EXIF
import { useState, useEffect, useRef } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [error, setError] = useState(null)
  const [permissionState, setPermissionState] = useState(null)
  const watchIdRef = useRef(null)

  function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      })
    })
  }

  function startWatching() {
    if (watchIdRef.current !== null) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setPosition(pos),
      (err) => setError(err),
      { enableHighAccuracy: true, maximumAge: 5000 },
    )
  }

  function stopWatching() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  useEffect(() => {
    return () => stopWatching()
  }, [])

  return { position, error, permissionState, getCurrentPosition, startWatching, stopWatching }
}
