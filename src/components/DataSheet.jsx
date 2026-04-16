// DataSheet.jsx — Three-state bottom sheet for the Prospecting module.
//
// State 1 — collapsed (80px peek):  drag handle + context line
// State 2 — half (~45vh visible):   tab bar + list
// State 3 — full (~92vh visible):   tab bar + full list
//
// Tab bar: Gold | Copper | Lead | Uranium | Quartz | Silver | More
// More expands to: Fluorspar | Marble | Amethyst | Jasper
//
// Gold tab:    gold_samples sorted by au_ppb desc. Pro gate on ≥100ppb rows.
// Other tabs:  mineral_localities filtered by mineral_category, sorted by minlocno asc.
// WMS pills shown below tab bar on Gold tab only.

import { useState, useRef, useEffect } from 'react'
import useMapStore from '../store/mapStore'
import useModuleStore from '../store/moduleStore'
import useUserStore from '../store/userStore'
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

// ── Mineral category colours ─────────────────────────────────────

const MINERAL_COLORS = {
  gold:      '#E8C96A',
  copper:    '#E8844A',
  lead:      '#9B9B9B',
  uranium:   '#7FBA00',
  quartz:    '#E8EAF0',
  silver:    '#C0C0C0',
  marble:    '#4AC0A0',
  fluorspar: '#A06BE8',
}

function getMineralColor(category) {
  return MINERAL_COLORS[category?.toLowerCase()] ?? '#6B7280'
}

// ── Tab configuration ────────────────────────────────────────────

const MAIN_TABS = [
  { id: 'gold',    label: 'Gold' },
  { id: 'copper',  label: 'Copper' },
  { id: 'lead',    label: 'Lead' },
  { id: 'uranium', label: 'Uranium' },
  { id: 'quartz',  label: 'Quartz' },
  { id: 'silver',  label: 'Silver' },
]

const MORE_TABS = [
  { id: 'fluorspar', label: 'Fluorspar' },
  { id: 'marble',    label: 'Marble' },
  { id: 'amethyst',  label: 'Amethyst' },
  { id: 'jasper',    label: 'Jasper' },
]

const MORE_TAB_IDS = new Set(MORE_TABS.map((t) => t.id))

// ── WMS toggle config ─────────────────────────────────────────────

const WMS_FILTERS = [
  { id: 'gold_heatmap', label: 'Heatmap' },
  { id: 'bedrock',      label: 'Geology' },
]

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

// ── Snap helpers ────────────────────────────────────────────────

function getSnap() {
  const h = typeof window !== 'undefined' ? window.innerHeight : 800
  // Container is full 100dvh. Collapsed peek (80px) sits above camera button (64px) with 32px clearance.
  // safe-area-inset-bottom handled in CSS via env(); JS uses 0 approximation.
  return {
    collapsed: h - 80 - 64 - 32,
    half:      Math.round(h * 0.55),
    full:      Math.round(h * 0.08),
  }
}

// ── Gold row (with Pro gate) ─────────────────────────────────────

function GoldRow({ sample, userPos, isPro, onTap }) {
  const isProGated = !isPro && sample.au_ppb >= 100
  const dist = userPos
    ? haversine(userPos.lat, userPos.lng, sample.lat, sample.lng)
    : null

  return (
    <div
      onClick={isProGated ? undefined : () => onTap(sample)}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '10px 16px',
        borderBottom: '1px solid var(--color-surface)',
        gap: 12,
        cursor: isProGated ? 'default' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
        opacity: isProGated ? 0.65 : 1,
        boxSizing: 'border-box',
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
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-primary)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          {tierLabel(sample.au_ppb)}
          <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>
            {sample.au_ppb} ppb
          </span>
          {isProGated && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C', letterSpacing: '0.05em', background: 'rgba(232,201,106,0.15)', border: '1px solid rgba(232,201,106,0.3)', borderRadius: 4, padding: '1px 5px' }}>
              PRO
            </span>
          )}
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
    </div>
  )
}

// ── Mineral row ──────────────────────────────────────────────────

function MineralRow({ locality, onTap }) {
  const color = getMineralColor(locality.mineral_category)

  return (
    <button
      onClick={() => onTap(locality)}
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
      {/* Category colour dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />

      {/* Locality info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {locality.mineral ?? locality.mineral_category ?? 'Mineral locality'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[locality.townland, locality.county].filter(Boolean).join(', ') || 'Ireland'}
        </div>
      </div>

      {/* Category badge */}
      {locality.mineral_category && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color,
            background: `${color}22`,
            border: `1px solid ${color}44`,
            borderRadius: 6,
            padding: '2px 7px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}
        >
          {locality.mineral_category}
        </span>
      )}
    </button>
  )
}

// ── Main component ──────────────────────────────────────────────

export default function DataSheet() {
  const {
    dataSheetState, setDataSheetState,
    mapInstance, layerVisibility, setLayerVisibility,
    setTierFilter, setSelectedSample, setSelectedMineral,
    setActiveMineralCategory,
  } = useMapStore()
  const { activeModule } = useModuleStore()
  const { isPro, setShowUpgradeSheet } = useUserStore()

  const [activeTab, setActiveTab] = useState('gold')
  const [moreExpanded, setMoreExpanded] = useState(false)
  const [goldSamples, setGoldSamples] = useState([])
  const [mineralLocalities, setMineralLocalities] = useState([])
  const [loading, setLoading] = useState(false)
  const [userPos, setUserPos] = useState(null)

  // ── Spring gesture state ─────────────────────────────────────
  const [currentTranslate, setCurrentTranslate] = useState(() => getSnap().collapsed)
  const [isDragging, setIsDragging] = useState(false)
  const currentTranslateRef = useRef(getSnap().collapsed)
  const handleRef = useRef(null)
  const drag = useRef({
    active: false,
    startY: 0,
    startTranslate: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
  })

  const isCollapsed = dataSheetState === 'collapsed'

  // ── Sync translateY when dataSheetState changes externally ───
  useEffect(() => {
    const snap = getSnap()
    const y = snap[dataSheetState]
    if (y !== undefined) {
      currentTranslateRef.current = y
      setCurrentTranslate(y)
    }
  }, [dataSheetState])

  // ── Attach touch handlers on handle element ───────────────────
  useEffect(() => {
    const el = handleRef.current
    if (!el) return

    function onStart(e) {
      const touch = e.touches[0]
      drag.current = {
        active: true,
        startY: touch.clientY,
        startTranslate: currentTranslateRef.current,
        lastY: touch.clientY,
        lastTime: performance.now(),
        velocity: 0,
      }
      setIsDragging(true)
    }

    function onMove(e) {
      if (!drag.current.active) return
      e.preventDefault()
      const touch = e.touches[0]
      const snap = getSnap()
      const dy = touch.clientY - drag.current.startY
      const newY = Math.max(snap.full, Math.min(drag.current.startTranslate + dy, snap.collapsed))

      const now = performance.now()
      const dt = now - drag.current.lastTime
      if (dt > 0) {
        drag.current.velocity = (touch.clientY - drag.current.lastY) / dt
      }
      drag.current.lastY = touch.clientY
      drag.current.lastTime = now

      currentTranslateRef.current = newY
      setCurrentTranslate(newY)
    }

    function onEnd() {
      if (!drag.current.active) return
      drag.current.active = false
      setIsDragging(false)

      const snap = getSnap()
      const curY = currentTranslateRef.current
      const vel = drag.current.velocity

      let targetName
      if (vel > 0.5) {
        targetName = curY < snap.half ? 'half' : 'collapsed'
      } else if (vel < -0.5) {
        targetName = curY > snap.half ? 'half' : 'full'
      } else {
        const dists = [
          { name: 'collapsed', d: Math.abs(curY - snap.collapsed) },
          { name: 'half',      d: Math.abs(curY - snap.half) },
          { name: 'full',      d: Math.abs(curY - snap.full) },
        ]
        dists.sort((a, b) => a.d - b.d)
        targetName = dists[0].name
      }

      const targetY = snap[targetName]
      currentTranslateRef.current = targetY
      setCurrentTranslate(targetY)
      setDataSheetState(targetName)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [setDataSheetState])

  // ── GPS ────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }, [])

  // ── Load data when tab changes ────────────────────────────────
  useEffect(() => {
    if (activeModule !== 'prospecting') return
    if (activeTab === 'gold') {
      loadGoldSamples()
    } else {
      loadMineralLocalities(activeTab)
    }
  }, [activeTab, activeModule]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadGoldSamples() {
    setLoading(true)
    setTierFilter('all') // reset map tier visibility to show all layers
    const { data, error } = await supabase
      .from('gold_samples')
      .select('id, sample_id, lat, lng, au_ppb, sample_type, survey')
      .order('au_ppb', { ascending: false })
      .limit(300)
    if (!error && data) setGoldSamples(data)
    setLoading(false)
  }

  async function loadMineralLocalities(category) {
    setLoading(true)
    setMineralLocalities([])
    const { data, error } = await supabase
      .from('mineral_localities')
      .select('id, minlocno, mineral, mineral_category, lat, lng, townland, county, description, notes')
      .ilike('mineral_category', category)
      .order('minlocno', { ascending: true })
      .limit(300)
    if (!error && data) setMineralLocalities(data)
    setLoading(false)
  }

  // ── Handle click (desktop / tap without drag) ──────────────────
  function onHandleClick() {
    const snap = getSnap()
    let targetName
    if (dataSheetState === 'collapsed')   targetName = 'half'
    else if (dataSheetState === 'half')   targetName = 'full'
    else                                  targetName = 'collapsed'
    currentTranslateRef.current = snap[targetName]
    setCurrentTranslate(snap[targetName])
    setDataSheetState(targetName)
  }

  // ── Fly to location + open detail sheet ───────────────────────
  function onGoldTap(sample) {
    if (mapInstance) {
      mapInstance.flyTo({ center: [sample.lng, sample.lat], zoom: 14, duration: 800 })
    }
    setDataSheetState('collapsed')
    setSelectedSample(sample)
  }

  function onMineralTap(locality) {
    if (mapInstance) {
      mapInstance.flyTo({ center: [locality.lng, locality.lat], zoom: 14, duration: 800 })
    }
    setDataSheetState('collapsed')
    setSelectedMineral(locality)
  }

  // ── WMS toggle ─────────────────────────────────────────────────
  function toggleWms(layerId) {
    setLayerVisibility(layerId, !layerVisibility[layerId])
  }

  // ── Tab selection ──────────────────────────────────────────────
  function selectTab(tabId) {
    setActiveTab(tabId)
    if (!MORE_TAB_IDS.has(tabId)) {
      setMoreExpanded(false)
    }
    // Sync map mineral layer visibility with the selected tab
    if (tabId === 'gold') {
      setActiveMineralCategory(null)
    } else {
      setActiveMineralCategory(tabId)
    }
  }

  // Context line for collapsed state
  const isMoreTabActive = MORE_TAB_IDS.has(activeTab)
  const contextText = loading
    ? 'Loading…'
    : activeTab === 'gold'
      ? `${goldSamples.length} gold samples`
      : `${mineralLocalities.length} ${activeTab} localities`

  if (activeModule !== 'prospecting') return null

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: '100dvh',
        background: 'var(--color-base)',
        borderTop: '1px solid var(--color-border)',
        borderRadius: '16px 16px 0 0',
        zIndex: 22,
        transform: `translateY(${currentTranslate}px)`,
        transition: isDragging ? 'none' : 'transform 350ms cubic-bezier(0.32, 0.72, 0, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        willChange: 'transform',
      }}
    >
      {/* ── Handle zone — drag target and tap-to-cycle ── */}
      <div
        ref={handleRef}
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
          touchAction: 'none',
        }}
      >
        {/* Handle bar — 32×4px */}
        <div
          style={{
            width: 32,
            height: 4,
            borderRadius: 2,
            background: '#2E3035',
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
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              padding: '0 16px 0',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              flexShrink: 0,
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {MAIN_TABS.map((tab) => {
              const active = activeTab === tab.id
              const color = getMineralColor(tab.id)
              return (
                <button
                  key={tab.id}
                  onClick={() => selectTab(tab.id)}
                  style={{
                    flexShrink: 0,
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    borderBottom: `2px solid ${active ? color : 'transparent'}`,
                    color: active ? color : 'var(--color-muted)',
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'color 120ms ease, border-color 120ms ease',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              )
            })}

            {/* More tab */}
            <button
              onClick={() => setMoreExpanded((v) => !v)}
              style={{
                flexShrink: 0,
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${isMoreTabActive ? getMineralColor(activeTab) : 'transparent'}`,
                color: isMoreTabActive ? getMineralColor(activeTab) : 'var(--color-muted)',
                fontSize: 13,
                fontWeight: isMoreTabActive ? 600 : 400,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'color 120ms ease, border-color 120ms ease',
                marginBottom: -1,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              More
              <svg
                width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
                style={{ transform: moreExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}
              >
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* More expanded sub-tabs */}
          {moreExpanded && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '8px 16px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                flexShrink: 0,
                background: 'var(--color-surface)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {MORE_TABS.map((tab) => {
                const active = activeTab === tab.id
                const color = getMineralColor(tab.id)
                return (
                  <button
                    key={tab.id}
                    onClick={() => selectTab(tab.id)}
                    style={{
                      flexShrink: 0,
                      padding: '5px 14px',
                      borderRadius: 20,
                      border: `1px solid ${active ? color : 'var(--color-border)'}`,
                      background: active ? `${color}22` : 'var(--color-raised)',
                      color: active ? color : 'var(--color-muted)',
                      fontSize: 12,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'border-color 120ms ease, color 120ms ease, background 120ms ease',
                    }}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* WMS pills — Gold tab only */}
          {activeTab === 'gold' && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '8px 16px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                flexShrink: 0,
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {WMS_FILTERS.map((f) => {
                const on = isPro && !!layerVisibility[f.id]
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      if (!isPro) { setShowUpgradeSheet(true); return }
                      toggleWms(f.id)
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '4px 12px',
                      borderRadius: 20,
                      border: `1px solid ${on ? 'rgba(91,143,212,0.6)' : 'var(--color-border)'}`,
                      background: on ? 'rgba(91,143,212,0.15)' : 'var(--color-surface)',
                      color: on ? '#5B8FD4' : 'var(--color-muted)',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                      opacity: isPro ? 1 : 0.6,
                    }}
                  >
                    {f.label}
                    {!isPro && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C', marginLeft: 5, letterSpacing: '0.05em' }}>
                        PRO
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

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
            {activeTab === 'gold'
              ? (userPos ? 'Nearest Gold Samples' : 'Top Gold Samples')
              : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Localities`}
          </div>

          {/* List — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
                Loading…
              </div>
            ) : activeTab === 'gold' ? (
              goldSamples.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
                  No samples found.
                </div>
              ) : (
                goldSamples.map((s) => (
                  <GoldRow
                    key={s.id}
                    sample={s}
                    userPos={userPos}
                    isPro={isPro}
                    onTap={onGoldTap}
                  />
                ))
              )
            ) : (
              mineralLocalities.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
                  No localities found.
                </div>
              ) : (
                mineralLocalities.map((loc) => (
                  <MineralRow
                    key={loc.id}
                    locality={loc}
                    onTap={onMineralTap}
                  />
                ))
              )
            )}
          </div>
        </>
      )}
    </div>
  )
}
