// SampleSheet.jsx — Sample detail bottom sheet.
// Opens when a gold circle or rock circle is tapped on the map,
// or when a row is tapped in DataSheet.
// Shows: tier, ppb, sample ID, type, arsenic, lead, ING coords,
//        upstream note, and a Waypoint button to pin to the session.
import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'
import { GOLD_TIERS } from '../lib/mapConfig'

// ── Tier helpers ───────────────────────────────────────────────────

function getTier(ppb) {
  return GOLD_TIERS.find((t) => ppb >= t.min && ppb < t.max) ?? GOLD_TIERS[GOLD_TIERS.length - 1]
}

// ── Stat card (2×2 grid) ───────────────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: 'var(--color-raised)',
        borderRadius: 'var(--radius-card)',
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

// ── Data row (coordinates + survey below grid) ─────────────────────

function DataRow({ label, value }) {
  if (value == null || value === '') return null
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '7px 0',
        borderBottom: '1px solid var(--color-surface)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 400, textAlign: 'right', maxWidth: '60%' }}>
        {value}
      </span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

export default function SampleSheet() {
  const { selectedSample, setSelectedSample, addSessionWaypoint } = useMapStore()
  const { isGuest, user } = useUserStore()
  const canSaveWaypoint = !isGuest && !!user

  if (!selectedSample) return null

  const ppb  = selectedSample.au_ppb ?? 0
  const tier = getTier(ppb)

  function handleSaveWaypoint() {
    addSessionWaypoint({
      lat: selectedSample.lat,
      lng: selectedSample.lng,
      name: `${tier.label} — ${ppb} ppb`,
      sampleId: selectedSample.sample_id,
    })
    setSelectedSample(null)
  }

  function handleClose() {
    setSelectedSample(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 39,
          background: 'transparent',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          background: 'var(--color-base)',
          borderTop: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sheet) var(--radius-sheet) 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          animation: 'slideUp 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 6,
          }}
        >
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              background: 'var(--color-border)',
            }}
          />
        </div>

        {/* Header row — tier + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px 12px',
          }}
        >
          {/* Tier badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: tier.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-muted)',
              }}
            >
              {tier.label}
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-border)',
                fontWeight: 400,
              }}
            >
              {tier.range}
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ppb hero value */}
        <div style={{ padding: '0 16px 16px' }}>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: tier.color,
              letterSpacing: '-0.02em',
            }}
          >
            {ppb}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: '#6B7280',
              marginLeft: 6,
            }}
          >
            ppb Au
          </span>
        </div>

        {/* 2×2 stat card grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 16px' }}>
          <StatCard label="Au (ppb)" value={ppb} />
          <StatCard label="Sample Type" value={selectedSample.sample_type ?? 'Stream sed.'} />
          <StatCard
            label="Arsenic (As)"
            value={selectedSample.as_mgkg != null ? `${selectedSample.as_mgkg} ppm` : null}
          />
          <StatCard
            label="Lead (Pb)"
            value={selectedSample.pb_mgkg != null ? `${selectedSample.pb_mgkg} ppm` : null}
          />
        </div>

        {/* Coordinate + survey rows */}
        <div style={{ padding: '0 16px' }}>
          <DataRow label="Sample ID"     value={selectedSample.sample_id} />
          <DataRow label="Survey"        value={selectedSample.survey} />
          <DataRow
            label="Easting (ING)"
            value={selectedSample.easting_ing != null ? selectedSample.easting_ing.toLocaleString() : null}
          />
          <DataRow
            label="Northing (ING)"
            value={selectedSample.northing_ing != null ? selectedSample.northing_ing.toLocaleString() : null}
          />
          {selectedSample.rock_type && (
            <DataRow label="Rock type" value={selectedSample.rock_type} />
          )}
        </div>

        {/* Upstream note */}
        <div
          style={{
            margin: '12px 16px',
            padding: '10px 12px',
            background: 'rgba(232,201,106,0.08)',
            border: '1px solid rgba(232,201,106,0.2)',
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 12, color: '#C9A84C', lineHeight: 1.5 }}>
            Pan upstream to trace the source. Gold in stream sediment travels down from the bedrock source.
          </span>
        </div>

        {/* Waypoint button */}
        <div style={{ padding: '4px 16px 8px' }}>
          <button
            onClick={canSaveWaypoint ? handleSaveWaypoint : undefined}
            disabled={!canSaveWaypoint}
            title={!canSaveWaypoint ? 'Sign in to save waypoints' : undefined}
            style={{
              width: '100%',
              padding: '12px',
              background: canSaveWaypoint ? 'var(--color-accent)' : 'var(--color-surface)',
              color: canSaveWaypoint ? '#0A0A0A' : 'var(--color-muted)',
              border: `1px solid ${canSaveWaypoint ? 'transparent' : 'var(--color-border)'}`,
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: canSaveWaypoint ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 2C5.24 2 3 4.24 3 7c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            {canSaveWaypoint ? 'Save Waypoint' : 'Sign in to save waypoints'}
          </button>
        </div>
      </div>
    </>
  )
}
