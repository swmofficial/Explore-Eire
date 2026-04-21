// useTracks.js — GPS recording + save tracks to Supabase tracks table.
// startTracking(): clears sessionTrail + elevationProfile, begins watchPosition, sets isTracking=true
// stopTracking(): stops GPS watch, computes stats, returns summary (does NOT auto-save)
// saveTrack(summary): persists track to Supabase, fires toast
// calcTrailDistanceM(): exported pure helper used by TrackOverlay for live display
import { useRef } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'
import useModuleStore from '../store/moduleStore'
import useMapStore from '../store/mapStore'

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY

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

// ── Elevation from MapTiler terrain-rgb-v2 ───────────────────────────
// Returns elevation in metres (integer) or null on failure.
async function fetchElevationM(lat, lng) {
  if (!MAPTILER_KEY) return null
  try {
    const tileZ = 12
    const n = Math.pow(2, tileZ)
    const tileX = Math.floor(((lng + 180) / 360) * n)
    const latRad = (lat * Math.PI) / 180
    const tileYf = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
    const tileY = Math.floor(tileYf)
    const pixelX = Math.floor((tileYf - tileY > 0 ? ((lng + 180) / 360 * n - tileX) : 0) * 256)
    // recalculate pixel coords properly
    const pxX = Math.floor(((lng + 180) / 360 * n - tileX) * 256)
    const pxY = Math.floor((tileYf - tileY) * 256)
    const url = `https://api.maptiler.com/tiles/terrain-rgb-v2/${tileZ}/${tileX}/${tileY}.png?key=${MAPTILER_KEY}`

    return await new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 256
          canvas.height = 256
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const d = ctx.getImageData(pxX, pxY, 1, 1).data
          const elev = -10000 + (d[0] * 256 * 256 + d[1] * 256 + d[2]) * 0.1
          resolve(Math.round(elev))
        } catch { resolve(null) }
      }
      img.onerror = () => resolve(null)
      img.src = url
    })
  } catch { return null }
}

// ── Elevation gain/loss from profile ────────────────────────────────
function calcElevationStats(profile) {
  let gain = 0
  let loss = 0
  for (let i = 1; i < profile.length; i++) {
    const delta = profile[i].elevation - profile[i - 1].elevation
    if (delta > 0) gain += delta
    else loss += Math.abs(delta)
  }
  return { gain: Math.round(gain), loss: Math.round(loss) }
}

// ── Hook ─────────────────────────────────────────────────────────────
export function useTracks() {
  const { user, isGuest } = useUserStore()

  const watchIdRef      = useRef(null)
  const startedAtRef    = useRef(null)
  const pointCountRef   = useRef(0) // throttle elevation fetches

  // startTracking — clears trail + elevation profile, starts GPS watch, sets isTracking=true
  function startTracking() {
    const { clearSessionTrail, setIsTracking, clearElevationProfile } = useMapStore.getState()
    clearSessionTrail()
    clearElevationProfile()
    startedAtRef.current = new Date().toISOString()
    pointCountRef.current = 0
    setIsTracking(true)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const store = useMapStore.getState()
        const pt = {
          lat:     pos.coords.latitude,
          lng:     pos.coords.longitude,
          alt:     pos.coords.altitude     ?? null,
          heading: pos.coords.heading      ?? null,
          ts:      pos.timestamp,
        }
        store.appendSessionTrailPoint(pt)
        pointCountRef.current += 1

        // Fetch elevation every 5th point to avoid hammering the tile API
        if (pointCountRef.current % 5 === 1) {
          const trail = store.sessionTrail
          const distM = calcTrailDistanceM([...trail, pt])
          fetchElevationM(pt.lat, pt.lng).then((elevation) => {
            if (elevation !== null) {
              useMapStore.getState().appendElevationPoint({ elevation, distanceM: distM })
            }
          })
        }
      },
      (err) => console.warn('[useTracks] GPS error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000 },
    )
  }

  // stopTracking — stops GPS watch, computes stats, returns summary (does NOT save to Supabase)
  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    const { sessionTrail, elevationProfile, setIsTracking } = useMapStore.getState()
    const { activeModule } = useModuleStore.getState()
    setIsTracking(false)

    const trail      = [...sessionTrail]
    const profile    = [...elevationProfile]
    const endedAt    = new Date().toISOString()
    const startedAt  = startedAtRef.current ?? endedAt
    const distanceM  = calcTrailDistanceM(trail)
    const durationS  = Math.floor((new Date(endedAt) - new Date(startedAt)) / 1000)
    const { gain: elevationGain, loss: elevationLoss } = calcElevationStats(profile)
    const avgPaceSecPerKm = distanceM > 0 ? (durationS / (distanceM / 1000)) : 0

    return {
      trail,
      profile,
      distance: distanceM,
      duration: durationS,
      elevationGain,
      elevationLoss,
      avgPaceSecPerKm,
      startedAt,
      endedAt,
      module: activeModule,
    }
  }

  // saveTrack — persists a completed track to Supabase, fires toast
  async function saveTrack(summary) {
    const { addToast } = useMapStore.getState()

    if (!user || isGuest) {
      addToast({ message: 'Sign in to save tracks', type: 'warning' })
      return false
    }

    const { isPro } = useUserStore.getState()

    const { count } = await supabase
      .from('tracks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (!isPro && count >= 3) {
      addToast({
        message: 'Session limit reached — upgrade to Pro to save unlimited tracks',
        type: 'warning',
      })
      return false
    }

    if (!summary || summary.trail.length < 2) {
      addToast({ message: 'Track too short to save', type: 'warning' })
      return false
    }

    const { error } = await supabase.from('tracks').insert([{
      user_id:           user.id,
      name:              `Track — ${new Date(summary.startedAt).toLocaleDateString('en-IE')}`,
      module:            summary.module,
      geojson:           { type: 'LineString', coordinates: summary.trail.map((p) => [p.lng, p.lat]) },
      distance_m:        summary.distance,
      duration_s:        summary.duration,
      elevation_gain_m:  summary.elevationGain,
      elevation_loss_m:  summary.elevationLoss,
      started_at:        summary.startedAt,
      ended_at:          summary.endedAt,
    }])

    if (error) {
      console.error('[useTracks] save error:', error.message)
      addToast({ message: 'Could not save track', type: 'error' })
      return false
    }

    addToast({
      message: `Track saved — ${(summary.distance / 1000).toFixed(2)} km`,
      type: 'success',
    })
    return true
  }

  return { startTracking, stopTracking, saveTrack }
}
