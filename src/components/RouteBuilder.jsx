// RouteBuilder.jsx — Basic route planner bottom panel
// Long-press on map (contextmenu event in Map.jsx) drops route points.
// This component shows the route panel: total distance, point list, Clear + Save.
// Pro gate enforced here and in Map.jsx contextmenu handler.
import { useState, useEffect } from 'react'
import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'
import { supabase } from '../lib/supabase'

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function calcRouteDistanceKm(points) {
  let d = 0
  for (let i = 1; i < points.length; i++) {
    d += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
  }
  return d
}

function fmtDist(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(2)}km`
}

export default function RouteBuilder() {
  const { routeBuilderOpen, setRouteBuilderOpen, routePoints, clearRoutePoints } = useMapStore()
  const { isPro, isGuest, setShowUpgradeSheet } = useUserStore()
  const [saving, setSaving] = useState(false)

  // Pro gate — redirect free users to UpgradeSheet and close
  useEffect(() => {
    if (routeBuilderOpen && (!isPro || isGuest)) {
      setShowUpgradeSheet(true)
      setRouteBuilderOpen(false)
    }
  }, [routeBuilderOpen, isPro, isGuest, setShowUpgradeSheet, setRouteBuilderOpen])

  if (!routeBuilderOpen) return null

  const distKm = calcRouteDistanceKm(routePoints)
  const canSave = routePoints.length >= 2 && !saving

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id ?? null
      const lineString = {
        type: 'LineString',
        coordinates: routePoints.map((p) => [p.lng, p.lat]),
      }
      const { error } = await supabase.from('routes').insert({
        user_id: userId,
        name: `Route ${new Date().toLocaleDateString('en-IE')}`,
        geojson: lineString,
        distance_km: distKm,
        created_at: new Date().toISOString(),
      })
      if (error) throw error
      useMapStore.getState().addToast({ message: 'Route saved', type: 'success' })
      clearRoutePoints()
      setRouteBuilderOpen(false)
    } catch {
      useMapStore.getState().addToast({ message: 'Failed to save route', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: 'var(--color-surface)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      }}
    >
      {/* Handle */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
        <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--color-border)' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>Route Builder</span>
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
            {routePoints.length === 0 ? 'Long-press map to add points' : fmtDist(distKm)}
          </span>
        </div>
        <button
          onClick={() => { clearRoutePoints(); setRouteBuilderOpen(false) }}
          aria-label="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 4, WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Point list */}
      {routePoints.length > 0 && (
        <div style={{ maxHeight: '30vh', overflowY: 'auto', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
          {routePoints.map((pt, i) => (
            <div
              key={pt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 16px',
                borderBottom: i < routePoints.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--color-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#0A0A0A', flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px 0' }}>
        <button
          onClick={clearRoutePoints}
          disabled={routePoints.length === 0}
          style={{
            flex: 1, padding: '11px 0',
            background: 'var(--color-border)',
            border: 'none', borderRadius: 10,
            cursor: routePoints.length === 0 ? 'default' : 'pointer',
            fontSize: 14, fontWeight: 600,
            color: routePoints.length === 0 ? 'var(--color-muted)' : 'var(--color-primary)',
            opacity: routePoints.length === 0 ? 0.45 : 1,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Clear
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            flex: 2, padding: '11px 0',
            background: canSave ? 'var(--color-accent)' : 'var(--color-border)',
            border: 'none', borderRadius: 10,
            cursor: canSave ? 'pointer' : 'default',
            fontSize: 14, fontWeight: 600,
            color: canSave ? '#0A0A0A' : 'var(--color-muted)',
            opacity: canSave ? 1 : 0.45,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {saving ? 'Saving…' : 'Save Route'}
        </button>
      </div>
    </div>
  )
}
