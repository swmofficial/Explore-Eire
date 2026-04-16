// FindSheet.jsx — Nearest gold/mineral discovery bottom sheet
// Opens from CategoryHeader Find button. On open: GPS → bounding box query → Haversine sort.
// Gold tab: t6/t7 free, higher tiers Pro gate. Minerals tab: full Pro gate.
import { useState, useEffect } from 'react'
import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'
import { useGeolocation } from '../hooks/useGeolocation'
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

const TIER_COLORS = {
  1: '#67000d',
  2: '#cb181d',
  3: '#fc4e2a',
  4: '#fd8d3c',
  5: '#fecc5c',
  6: '#ffffb2',
  7: '#74c476',
}

function getTier(ppb) {
  if (ppb >= 500) return 1
  if (ppb >= 100) return 2
  if (ppb >= 50)  return 3
  if (ppb >= 10)  return 4
  if (ppb >= 5)   return 5
  if (ppb >= 2)   return 6
  return 7
}

function fmtDist(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(1)}km`
}

export default function FindSheet() {
  const { findSheetOpen, setFindSheetOpen, setSelectedSample, setSelectedMineral, mapInstance } = useMapStore()
  const { isPro, isGuest, setShowUpgradeSheet } = useUserStore()
  const { getCurrentPosition } = useGeolocation()

  const [tab, setTab] = useState('gold')
  const [loading, setLoading] = useState(false)
  const [goldResults, setGoldResults] = useState([])
  const [mineralResults, setMineralResults] = useState([])
  const [fetchError, setFetchError] = useState(null)

  // Reset state when sheet closes
  useEffect(() => {
    if (!findSheetOpen) {
      setTab('gold')
      setGoldResults([])
      setMineralResults([])
      setFetchError(null)
    }
  }, [findSheetOpen])

  // Load nearby data when sheet opens
  useEffect(() => {
    if (!findSheetOpen) return
    loadNearby()
  }, [findSheetOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadNearby() {
    setLoading(true)
    setFetchError(null)
    try {
      const pos = await getCurrentPosition()
      const { latitude: lat, longitude: lng } = pos.coords
      const LAT_DELTA = 1.5
      const LNG_DELTA = 2.0
      const MAX_KM = 100

      const [goldRes, mineralRes] = await Promise.all([
        supabase
          .from('gold_samples')
          .select('id, au_ppb, townland, lat, lng, sample_id, as_mgkg, pb_mgkg, sample_type, survey, easting_ing, northing_ing, rock_type, rock_desc')
          .gte('lat', lat - LAT_DELTA)
          .lte('lat', lat + LAT_DELTA)
          .gte('lng', lng - LNG_DELTA)
          .lte('lng', lng + LNG_DELTA)
          .limit(500),
        supabase
          .from('mineral_localities')
          .select('id, mineral, mineral_category, townland, county, lat, lng, minlocno, description, notes')
          .gte('lat', lat - LAT_DELTA)
          .lte('lat', lat + LAT_DELTA)
          .gte('lng', lng - LNG_DELTA)
          .lte('lng', lng + LNG_DELTA)
          .limit(500),
      ])

      const gold = (goldRes.data ?? [])
        .map((s) => ({ ...s, distKm: haversineKm(lat, lng, s.lat, s.lng) }))
        .filter((s) => s.distKm <= MAX_KM)
        .sort((a, b) => a.distKm - b.distKm)
        .slice(0, 50)

      const minerals = (mineralRes.data ?? [])
        .map((m) => ({ ...m, distKm: haversineKm(lat, lng, m.lat, m.lng) }))
        .filter((m) => m.distKm <= MAX_KM)
        .sort((a, b) => a.distKm - b.distKm)
        .slice(0, 50)

      setGoldResults(gold)
      setMineralResults(minerals)
    } catch (e) {
      setFetchError(e?.message ?? 'Could not get your location')
    } finally {
      setLoading(false)
    }
  }

  function handleGoldRow(sample) {
    const tier = getTier(sample.au_ppb ?? 0)
    if (tier < 6 && !isPro) {
      setShowUpgradeSheet(true)
      return
    }
    if (mapInstance) {
      mapInstance.flyTo({ center: [sample.lng, sample.lat], zoom: 14, duration: 800 })
    }
    setSelectedSample({
      id: sample.id,
      sample_id: sample.sample_id,
      au_ppb: sample.au_ppb ?? 0,
      as_mgkg: sample.as_mgkg,
      pb_mgkg: sample.pb_mgkg,
      sample_type: sample.sample_type,
      survey: sample.survey,
      easting_ing: sample.easting_ing,
      northing_ing: sample.northing_ing,
      rock_type: sample.rock_type,
      rock_desc: sample.rock_desc,
      lat: sample.lat,
      lng: sample.lng,
    })
    setFindSheetOpen(false)
  }

  function handleMineralRow(loc) {
    if (!isPro) {
      setShowUpgradeSheet(true)
      return
    }
    if (mapInstance) {
      mapInstance.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 800 })
    }
    setSelectedMineral({
      id: loc.id,
      minlocno: loc.minlocno,
      mineral: loc.mineral,
      mineral_category: loc.mineral_category,
      townland: loc.townland,
      county: loc.county,
      description: loc.description,
      notes: loc.notes,
      lat: loc.lat,
      lng: loc.lng,
    })
    setFindSheetOpen(false)
  }

  if (!findSheetOpen) return null

  // Free users see t6/t7 gold; Pro users see all
  const visibleGold = isPro
    ? goldResults
    : goldResults.filter((s) => getTier(s.au_ppb ?? 0) >= 6)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          pointerEvents: 'auto',
        }}
        onClick={() => setFindSheetOpen(false)}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '72vh',
          background: 'var(--color-surface)',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--color-border)' }} />
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 8px', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>Nearby</span>
          <button
            onClick={() => setFindSheetOpen(false)}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 4, WebkitTapHighlightColor: 'transparent' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', flexShrink: 0, padding: '0 16px' }}>
          {[
            { key: 'gold', label: 'Gold', proRequired: false },
            { key: 'minerals', label: 'Minerals', proRequired: true },
          ].map(({ key, label, proRequired }) => (
            <button
              key={key}
              onClick={() => {
                if (proRequired && !isPro) { setShowUpgradeSheet(true); return }
                setTab(key)
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 0',
                marginRight: 20,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: tab === key ? 'var(--color-accent)' : 'var(--color-muted)',
                borderBottom: tab === key ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
                WebkitTapHighlightColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {label}
              {proRequired && !isPro && (
                <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--color-accent)', color: '#0A0A0A', borderRadius: 3, padding: '1px 4px' }}>
                  PRO
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, color: 'var(--color-muted)' }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13 }}>Finding nearby locations…</span>
            </div>
          )}

          {/* Error */}
          {!loading && fetchError && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 8, color: 'var(--color-muted)', padding: '0 24px', textAlign: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 13 }}>{fetchError}</span>
              <button
                onClick={loadNearby}
                style={{ marginTop: 4, fontSize: 13, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Gold results */}
          {!loading && !fetchError && tab === 'gold' && (
            visibleGold.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--color-muted)', fontSize: 13 }}>
                No gold samples within 100km
              </div>
            ) : (
              visibleGold.map((s) => {
                const tier = getTier(s.au_ppb ?? 0)
                const locked = !isPro && tier < 6
                return (
                  <button
                    key={s.id}
                    onClick={() => handleGoldRow(s)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 16px',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      WebkitTapHighlightColor: 'transparent',
                      opacity: locked ? 0.5 : 1,
                    }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: TIER_COLORS[tier],
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.15)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {s.au_ppb ?? 0} ppb
                        {locked && (
                          <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--color-accent)', color: '#0A0A0A', borderRadius: 3, padding: '1px 4px' }}>
                            PRO
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.townland ?? '—'}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-muted)', flexShrink: 0 }}>{fmtDist(s.distKm)}</span>
                  </button>
                )
              })
            )
          )}

          {/* Mineral results */}
          {!loading && !fetchError && tab === 'minerals' && (
            mineralResults.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--color-muted)', fontSize: 13 }}>
                No mineral localities within 100km
              </div>
            ) : (
              mineralResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleMineralRow(m)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.mineral ?? 'Unknown mineral'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.townland ?? m.county ?? '—'}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)', flexShrink: 0 }}>{fmtDist(m.distKm)}</span>
                </button>
              ))
            )
          )}
        </div>
      </div>
    </div>
  )
}
