// OfflineManager.jsx — Offline map download manager.
// Opens as a bottom sheet from LayerPanel "Download for offline" button (Pro gate).
// Downloads MapTiler satellite tiles for the current map view.
import { useState, useEffect } from 'react'
import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'
import { useOffline, estimateTileCount, estimateSizeBytes, formatBytes } from '../hooks/useOffline'

const MAX_ZOOM = 12
const MIN_ZOOM = 5
const TILE_WARN_THRESHOLD = 3000

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Progress bar ─────────────────────────────────────────────────

function ProgressBar({ value }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${value}%`,
          background: 'var(--color-accent)',
          borderRadius: 3,
          transition: 'width 200ms ease',
        }}
      />
    </div>
  )
}

// ── Storage bar ───────────────────────────────────────────────────

function StorageBar({ used, total }) {
  if (!total) return null
  const pct = Math.min(100, (used / total) * 100)
  return (
    <div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-muted)', borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
        {formatBytes(used)} used · {formatBytes(total)} available
      </span>
    </div>
  )
}

// ── Region row ────────────────────────────────────────────────────

function RegionRow({ region, onDelete }) {
  const [confirm, setConfirm] = useState(false)

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Map pin icon */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.6 }}>
        <path d="M8 1a5 5 0 00-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 00-5-5z" stroke="var(--color-primary)" strokeWidth="1.3" strokeLinejoin="round"/>
        <circle cx="8" cy="6" r="1.5" stroke="var(--color-primary)" strokeWidth="1.3"/>
      </svg>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {region.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
          {formatBytes(region.sizeBytes)} · {region.tileCount.toLocaleString()} tiles · zoom {region.minZoom}–{region.maxZoom}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 1 }}>
          {formatDate(region.downloadedAt)}
        </div>
      </div>

      {confirm ? (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => { onDelete(region.name); setConfirm(false) }}
            style={{
              padding: '5px 10px', borderRadius: 6,
              background: 'rgba(232,75,75,0.15)', border: '1px solid rgba(232,75,75,0.4)',
              color: 'var(--color-danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Delete
          </button>
          <button
            onClick={() => setConfirm(false)}
            style={{
              padding: '5px 10px', borderRadius: 6,
              background: 'var(--color-raised)', border: '1px solid var(--color-border)',
              color: 'var(--color-muted)', fontSize: 12, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          aria-label="Delete region"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-muted)', padding: 4, flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4h12M6 4V2h4v2M13 4l-1 10H4L3 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export default function OfflineManager() {
  const { showOfflineManager, setShowOfflineManager, mapInstance } = useMapStore()
  const { isPro } = useUserStore()
  const {
    isOnline, regions, downloading, progress, downloadError,
    downloadRegion, deleteRegion, getStorageUsage,
  } = useOffline()

  const [name,      setName]      = useState('')
  const [bbox,      setBbox]      = useState(null)
  const [estimate,  setEstimate]  = useState(null)
  const [storage,   setStorage]   = useState(null)
  const [nameError, setNameError] = useState('')

  // Load current map bounds and storage on open
  useEffect(() => {
    if (!showOfflineManager || !isPro) return

    if (mapInstance) {
      try {
        const b = mapInstance.getBounds()
        const newBbox = {
          west:  b.getWest(),
          south: b.getSouth(),
          east:  b.getEast(),
          north: b.getNorth(),
        }
        setBbox(newBbox)
        const count = estimateTileCount(newBbox, MIN_ZOOM, MAX_ZOOM)
        setEstimate({ count, bytes: estimateSizeBytes(count) })
      } catch { /* map not ready */ }
    }

    getStorageUsage().then(setStorage)
    setName('')
    setNameError('')
  }, [showOfflineManager, mapInstance, isPro, getStorageUsage])

  if (!showOfflineManager) return null

  async function handleDownload() {
    const trimmed = name.trim()
    if (!trimmed) { setNameError('Enter a name for this region.'); return }
    if (regions.some((r) => r.name === trimmed)) {
      setNameError('A region with this name already exists.')
      return
    }
    setNameError('')
    const ok = await downloadRegion({ name: trimmed, bbox, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM })
    if (ok) {
      setName('')
      getStorageUsage().then(setStorage)
    }
  }

  const tooLarge = estimate?.count > TILE_WARN_THRESHOLD

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => !downloading && setShowOfflineManager(false)}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 38,
          animation: 'backdropFadeIn 200ms ease-out',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: 'min(82vh, 680px)',
          background: 'var(--color-base)',
          borderTop: '1px solid var(--color-border)',
          borderRadius: '16px 16px 0 0',
          zIndex: 39,
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          animation: 'slideUp 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', flexShrink: 0 }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--color-border)' }} />
        </div>

        {/* Header */}
        <div
          style={{
            height: 48, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 16px',
            borderBottom: '1px solid var(--color-border)', flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M1 3a1 1 0 011-1h4l2 3h8a1 1 0 011 1v9a1 1 0 01-1 1H2a1 1 0 01-1-1V3z" stroke="var(--color-accent)" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M9 8v4M7 10h4" stroke="var(--color-accent)" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>
              Download Maps
            </span>
          </div>
          <button
            onClick={() => !downloading && setShowOfflineManager(false)}
            disabled={downloading}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: downloading ? 'not-allowed' : 'pointer',
              color: 'var(--color-muted)', padding: 6, opacity: downloading ? 0.4 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

          {/* Online/offline status */}
          {!isOnline && (
            <div
              style={{
                padding: '8px 12px', borderRadius: 8, marginBottom: 14,
                background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)',
                fontSize: 12, color: '#FF4444',
              }}
            >
              You're offline. Downloads unavailable. Cached areas still work.
            </div>
          )}

          {/* Current view download section */}
          <div
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 12, padding: '14px', marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Current Map View
            </div>

            {/* Estimates */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Zoom levels', value: `${MIN_ZOOM}–${MAX_ZOOM}` },
                { label: 'Tiles',       value: estimate ? estimate.count.toLocaleString() : '—' },
                { label: 'Est. size',   value: estimate ? formatBytes(estimate.bytes) : '—' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    flex: 1, textAlign: 'center', padding: '8px 4px',
                    background: 'var(--color-raised)', borderRadius: 8,
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 2 }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Large area warning */}
            {tooLarge && (
              <div
                style={{
                  padding: '7px 10px', borderRadius: 6, marginBottom: 10,
                  background: 'rgba(232,168,75,0.1)', border: '1px solid rgba(232,168,75,0.3)',
                  fontSize: 11, color: '#E8A84B',
                }}
              >
                Large area. Zoom in on the map before downloading to reduce size.
              </div>
            )}

            {/* Name input */}
            <div style={{ marginBottom: 10 }}>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError('') }}
                placeholder="Region name (e.g. Kerry Coast)"
                maxLength={40}
                disabled={downloading}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--color-raised)',
                  border: `1px solid ${nameError ? 'rgba(232,75,75,0.5)' : 'var(--color-border)'}`,
                  borderRadius: 8,
                  color: 'var(--color-primary)',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {nameError && (
                <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4 }}>{nameError}</div>
              )}
            </div>

            {/* Download button + progress */}
            {downloading ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Downloading…</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)' }}>{progress}%</span>
                </div>
                <ProgressBar value={progress} />
              </div>
            ) : (
              <button
                onClick={handleDownload}
                disabled={!isOnline || !bbox}
                style={{
                  width: '100%', height: 42,
                  background: isOnline && bbox ? 'var(--color-accent)' : 'var(--color-raised)',
                  border: 'none', borderRadius: 8,
                  color: isOnline && bbox ? '#0A0A0A' : 'var(--color-muted)',
                  fontSize: 13, fontWeight: 700,
                  cursor: isOnline && bbox ? 'pointer' : 'not-allowed',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                ↓ Download This Area
              </button>
            )}

            {downloadError && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-danger)' }}>{downloadError}</div>
            )}
          </div>

          {/* Saved regions */}
          <div style={{ marginBottom: 4 }}>
            <div
              style={{
                fontSize: 12, fontWeight: 600, color: 'var(--color-muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span>Saved Regions</span>
              <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--color-muted)' }}>
                {regions.length} {regions.length === 1 ? 'region' : 'regions'}
              </span>
            </div>

            {regions.length === 0 ? (
              <div
                style={{
                  textAlign: 'center', padding: '24px 16px',
                  color: 'var(--color-muted)', fontSize: 13,
                  background: 'var(--color-surface)', borderRadius: 10,
                  border: '1px solid var(--color-border)',
                }}
              >
                No offline regions saved yet.
                <br/>
                <span style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  Download an area above to use maps offline.
                </span>
              </div>
            ) : (
              regions.map((region) => (
                <RegionRow key={region.name} region={region} onDelete={deleteRegion} />
              ))
            )}
          </div>

          {/* Storage usage */}
          {storage && storage.quota > 0 && (
            <div style={{ marginTop: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                Device Storage
              </div>
              <StorageBar used={storage.usage} total={storage.quota} />
            </div>
          )}

          {/* Satellite-only notice */}
          <div style={{ marginTop: 14, marginBottom: 16, padding: '8px 10px', borderRadius: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.4 }}>
              Offline mode caches the Satellite basemap only. Outdoor and Topo maps require a connection.
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
