// DataSheet.jsx — Three-state bottom sheet replacing the right-side layer panel.
//
// State 1 — collapsed (60px):  drag handle + sample count context line
// State 2 — half (~46vh):      filter pills + nearest samples list
// State 3 — full (~85vh):      same as half, full height, complete list
//
// Swipe up on handle → advance state. Swipe down → collapse state.
// Layers button in CornerControls opens to 'half'.

import { useState, useRef, useEffect } from 'react'
import useMapStore from '../store/mapStore'
import useModuleStore from '../store/moduleStore'
import { supabase } from '../lib/supabase'

// ── Tier helpers ────────────────────────────────────────────────

function tierColor(ppb) {
  if (ppb >= 500) return '#cb181d'
  if (ppb >= 100) return '#fc4e2a'
  if (ppb >= 50)  return '#fd8d3c'
  if (ppb >= 10)  return '#fecc5c'
  if (ppb >= 5)   return '#ffffb2'
  if (ppb >= 2)   return '#a1d99b'
  return '#74c476'
}

function tierLabel(ppb) {
  if (ppb >= 500) return 'Exceptional'
  if (ppb >= 100) return 'Very High'
  if (ppb >= 50)  return 'High'
  if (ppb >= 10)  return 'Significant'
  if (ppb >= 5)   return 'Anomalous'
  if (ppb >= 2)   return 'Low'
  return 'Background'
}

// ── Haversine distance (km) ──────────────────────────────────────

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

// ── Filter pill config ──────────────────────────────────────────
// Data filters (mutually exclusive): all / exceptional / high / significant
// WMS toggles (independent): heatmap / geology

const DATA_FILTERS = [
  { id: 'all',         label: 'All',         minPpb: 0 },
  { id: 'exceptional', label: 'Exceptional',  minPpb: 500 },
  { id: 'high',        label: 'High',         minPpb: 50 },
  { id: 'significant', label: 'Significant',  minPpb: 10 },
]

const WMS_FILTERS = [
  { id: 'gold_heatmap', label: 'Heatmap' },
  { id: 'bedrock',      label: 'Geology' },
]

// ── Sample row ──────────────────────────────────────────────────

function SampleRow({ sample, userPos, onTap }) {
  const dist = userPos
    ? haversine(userPos.lat, userPos.lng, sample.lat, sample.lng)
    : null

  return (
    <button
      onClick={() => onTap(sample)}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '10px 16px',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid var(--color-surface)',
        cursor: 'pointer',
        gap: 12,
        WebkitTapHighlightColor: 'transparent',
        textAlign: 'left',
      }}
    >
      {/* Tier colour dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: tierColor(sample.au_ppb),
          flexShrink: 0,
        }}
      />

      {/* Sample info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-primary)', marginBottom: 2 }}>
          {tierLabel(sample.au_ppb)}
          <span style={{ fontWeight: 400, color: 'var(--color-muted)', marginLeft: 6 }}>
            {sample.au_ppb} ppb
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sample.sample_type ?? 'Stream sediment'} · {sample.survey ?? 'GSI'}
        </div>
      </div>

      {/* Distance */}
      {dist !== null && (
        <span style={{ fontSize: 12, color: 'var(--color-muted)', flexShrink: 0 }}>
          {formatDist(dist)}
        </span>
      )}
    </button>
  )
}

// ── Main component ──────────────────────────────────────────────

const SWIPE_THRESHOLD = 40

export default function DataSheet() {
  const {
    dataSheetState, setDataSheetState,
    mapInstance, layerVisibility, setLayerVisibility,
    setTierFilter, setSelectedSample,
  } = useMapStore()
  const { activeModule } = useModuleStore()

  const [activeDataFilter, setActiveDataFilter] = useState('all')
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(false)
  const [userPos, setUserPos] = useState(null)

  const touchStartY = useRef(null)
  const isCollapsed = dataSheetState === 'collapsed'
  const isHalf     = dataSheetState === 'half'
  const isFull     = dataSheetState === 'full'

  // ── GPS ────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }, [])

  // ── Load samples ───────────────────────────────────────────────
  useEffect(() => {
    if (activeModule !== 'prospecting') return
    loadSamples()
  }, [activeModule, activeDataFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSamples() {
    setLoading(true)
    let query = supabase
      .from('gold_samples')
      .select('id, sample_id, lat, lng, au_ppb, as_mgkg, pb_mgkg, sample_type, survey, easting_ing, northing_ing')
      .limit(300)

    const minPpb = DATA_FILTERS.find((f) => f.id === activeDataFilter)?.minPpb ?? 0
    if (minPpb > 0) query = query.gte('au_ppb', minPpb)

    const { data, error } = await query.order('au_ppb', { ascending: false })

    if (!error && data) setSamples(data)
    setLoading(false)
  }

  // ── Sorted samples ─────────────────────────────────────────────
  const sortedSamples = userPos
    ? [...samples].sort(
        (a, b) =>
          haversine(userPos.lat, userPos.lng, a.lat, a.lng) -
          haversine(userPos.lat, userPos.lng, b.lat, b.lng)
      )
    : samples

  // ── Swipe handlers ─────────────────────────────────────────────
  function onTouchStart(e) {
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e) {
    if (touchStartY.current === null) return
    const delta = touchStartY.current - e.changedTouches[0].clientY
    touchStartY.current = null

    if (delta > SWIPE_THRESHOLD) {
      // Swipe up → advance
      if (isCollapsed) setDataSheetState('half')
      else if (isHalf)  setDataSheetState('full')
    } else if (delta < -SWIPE_THRESHOLD) {
      // Swipe down → retreat
      if (isFull)  setDataSheetState('half')
      else if (isHalf) setDataSheetState('collapsed')
    }
  }

  function onHandleClick() {
    if (isCollapsed)      setDataSheetState('half')
    else if (isHalf)      setDataSheetState('full')
    else                  setDataSheetState('collapsed')
  }

  // ── Fly to sample + open detail sheet ─────────────────────────
  function onSampleTap(sample) {
    if (mapInstance) {
      mapInstance.flyTo({ center: [sample.lng, sample.lat], zoom: 14, duration: 800 })
    }
    setDataSheetState('collapsed')
    setSelectedSample(sample)
  }

  // ── WMS toggle ─────────────────────────────────────────────────
  function toggleWms(layerId) {
    setLayerVisibility(layerId, !layerVisibility[layerId])
  }

  // ── Heights ────────────────────────────────────────────────────
  const heightMap = {
    collapsed: '60px',
    half: '46vh',
    full: '85vh',
  }
  const sheetHeight = heightMap[dataSheetState] ?? '60px'

  // Context line for collapsed state
  const contextText = loading
    ? 'Loading samples…'
    : userPos
      ? `${sortedSamples.length} samples — sorted by distance`
      : `${samples.length} gold samples in Ireland`

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: sheetHeight,
        background: 'var(--color-base)',
        borderTop: '1px solid var(--color-border)',
        borderRadius: '16px 16px 0 0',
        zIndex: 22,
        transition: 'height 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* ── Handle zone — touch target and tap-to-cycle ── */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={onHandleClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 10,
          paddingBottom: isCollapsed ? 0 : 6,
          flexShrink: 0,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        {/* Pill */}
        <div
          style={{
            width: 32,
            height: 4,
            borderRadius: 2,
            background: 'var(--color-border)',
            marginBottom: isCollapsed ? 8 : 4,
            flexShrink: 0,
          }}
        />

        {/* Collapsed context text */}
        {isCollapsed && (
          <span
            style={{
              fontSize: 13,
              color: 'var(--color-muted)',
              fontWeight: 500,
              paddingBottom: 6,
            }}
          >
            {contextText}
          </span>
        )}
      </div>

      {/* ── Half / Full content ── */}
      {!isCollapsed && (
        <>
          {/* Filter pills */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '4px 16px 12px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              flexShrink: 0,
            }}
          >
            {/* Data filter pills — mutually exclusive */}
            {DATA_FILTERS.map((f) => {
              const active = activeDataFilter === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => { setActiveDataFilter(f.id); setTierFilter(f.id) }}
                  style={{
                    flexShrink: 0,
                    padding: '5px 14px',
                    borderRadius: 20,
                    border: `1px solid ${active ? '#E8C96A' : 'var(--color-border)'}`,
                    background: active ? 'rgba(232,201,106,0.15)' : 'var(--color-surface)',
                    color: active ? '#E8C96A' : 'var(--color-muted)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'border-color 150ms ease, color 150ms ease, background 150ms ease',
                  }}
                >
                  {f.label}
                </button>
              )
            })}

            {/* Divider between groups */}
            <div style={{ width: 1, height: 28, background: 'var(--color-border)', alignSelf: 'center', flexShrink: 0 }} />

            {/* WMS toggle pills — independent on/off */}
            {WMS_FILTERS.map((f) => {
              const on = !!layerVisibility[f.id]
              return (
                <button
                  key={f.id}
                  onClick={() => toggleWms(f.id)}
                  style={{
                    flexShrink: 0,
                    padding: '5px 14px',
                    borderRadius: 20,
                    border: `1px solid ${on ? 'rgba(91,143,212,0.6)' : 'var(--color-border)'}`,
                    background: on ? 'rgba(91,143,212,0.15)' : 'var(--color-surface)',
                    color: on ? '#5B8FD4' : 'var(--color-muted)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'border-color 150ms ease, color 150ms ease, background 150ms ease',
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--color-border)', flexShrink: 0 }} />

          {/* Section header */}
          <div
            style={{
              padding: '8px 16px 4px',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-muted)',
              flexShrink: 0,
            }}
          >
            {userPos ? 'Nearest Samples' : 'Top Samples'}
          </div>

          {/* Sample list — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
                Loading…
              </div>
            ) : sortedSamples.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
                No samples match this filter.
              </div>
            ) : (
              sortedSamples.map((s) => (
                <SampleRow
                  key={s.id}
                  sample={s}
                  userPos={userPos}
                  onTap={onSampleTap}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
