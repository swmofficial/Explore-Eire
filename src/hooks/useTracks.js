// useTracks.js — GPS recording + save tracks to Supabase tracks table.
// startTracking(): clears sessionTrail, begins watchPosition, sets isTracking=true
// stopTracking(): stops watch, saves GeoJSON LineString to Supabase, returns summary
// calcTrailDistanceM(): exported pure helper used by TrackOverlay for live display
import { useRef } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'
import useModuleStore from '../store/moduleStore'
import useMapStore from '../store/mapStore'

// ── Haversine distance ───────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Exported — used by TrackOverlay for live distance display ────────
export function calcTrailDistanceM(trail) {
  let d = 0
  for (let i = 1; i < trail.length; i++) {
    d += haversineKm(
      trail[i - 1].lat, trail[i - 1].lng,
      trail[i].lat,     trail[i].lng,
    )
  }
  return d * 1000 // metres
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useTracks() {
  const { user, isGuest } = useUserStore()

  const watchIdRef   = useRef(null)
  const startedAtRef = useRef(null)

  // startTracking — clears trail, starts GPS watch, sets isTracking=true
  function startTracking() {
    const { clearSessionTrail, setIsTracking } = useMapStore.getState()
    clearSessionTrail()
    startedAtRef.current = new Date().toISOString()
    setIsTracking(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        useMapStore.getState().appendSessionTrailPoint({
          lat:     pos.coords.latitude,
          lng:     pos.coords.longitude,
          alt:     pos.coords.altitude     ?? null,
          heading: pos.coords.heading      ?? null,
          ts:      pos.timestamp,
        })
      },
      (err) => console.warn('[useTracks] GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000 },
    )
  }

  // stopTracking — stops GPS watch, saves to Supabase, returns summary object
  async function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    const { sessionTrail, setIsTracking, addToast } = useMapStore.getState()
    const { activeModule } = useModuleStore.getState()
    setIsTracking(false)

    const trail      = [...sessionTrail]
    const endedAt    = new Date().toISOString()
    const startedAt  = startedAtRef.current ?? endedAt
    const distanceM  = calcTrailDistanceM(trail)
    const durationS  = Math.floor((new Date(endedAt) - new Date(startedAt)) / 1000)

    // Persist to Supabase for authenticated users with a meaningful trail
    if (user && !isGuest && trail.length >= 2) {
      const { error } = await supabase.from('tracks').insert([{
        user_id:     user.id,
        name:        `Track — ${new Date(startedAt).toLocaleDateString('en-IE')}`,
        module:      activeModule,
        geojson:     { type: 'LineString', coordinates: trail.map((p) => [p.lng, p.lat]) },
        distance_m:  distanceM,
        duration_s:  durationS,
        started_at:  startedAt,
        ended_at:    endedAt,
      }])
      if (error) {
        console.error('[useTracks] save error:', error.message)
        addToast({ message: 'Could not save track', type: 'error' })
      } else {
        addToast({
          message: `Track saved — ${(distanceM / 1000).toFixed(2)} km`,
          type: 'success',
        })
      }
    }

    return { trail, distance: distanceM, duration: durationS, startedAt, endedAt }
  }

  return { startTracking, stopTracking }
}
