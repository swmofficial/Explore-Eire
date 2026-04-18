// MineralSheet.jsx — Mineral locality detail bottom sheet.
// Opens when a mineral dot is tapped on the map or a mineral row is tapped in DataSheet.
// Shows: mineral name, category badge, townland, county, mineral_category, description, notes, coordinates.
import useMapStore from '../store/mapStore'

// ── Category colour map ────────────────────────────────────────────
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

function getCategoryColor(category) {
  return MINERAL_COLORS[category?.toLowerCase()] ?? '#6B7280'
}

// ── Data row ───────────────────────────────────────────────────────

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
      <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 400, textAlign: 'right', maxWidth: '65%' }}>
        {value}
      </span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

export default function MineralSheet() {
  const { selectedMineral, setSelectedMineral } = useMapStore()

  if (!selectedMineral) return null

  const category = selectedMineral.mineral_category ?? 'unknown'
  const color = getCategoryColor(category)

  function handleClose() {
    setSelectedMineral(null)
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

        {/* Header row — category badge + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px 12px',
          }}
        >
          {/* Category badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 12,
              background: `${color}22`,
              border: `1px solid ${color}55`,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color,
              }}
            >
              {category}
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

        {/* Mineral name — H1 */}
        <div style={{ padding: '0 16px 16px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: color,
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            {selectedMineral.mineral ?? 'Unknown Mineral'}
          </h1>
        </div>

        {/* Data grid */}
        <div style={{ padding: '0 16px' }}>
          <DataRow label="Locality No."   value={selectedMineral.minlocno} />
          <DataRow label="Townland"       value={selectedMineral.townland} />
          <DataRow label="County"         value={selectedMineral.county} />
          <DataRow label="Category"       value={category} />
          <DataRow
            label="Latitude"
            value={selectedMineral.lat != null ? selectedMineral.lat.toFixed(5) : null}
          />
          <DataRow
            label="Longitude"
            value={selectedMineral.lng != null ? selectedMineral.lng.toFixed(5) : null}
          />
        </div>

        {/* Description */}
        {selectedMineral.description && (
          <div
            style={{
              margin: '12px 16px 0',
              padding: '10px 12px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--color-primary)', lineHeight: 1.55 }}>
              {selectedMineral.description}
            </span>
          </div>
        )}

        {/* Notes */}
        {selectedMineral.notes && (
          <div
            style={{
              margin: '8px 16px 0',
              padding: '10px 12px',
              background: `${color}0f`,
              border: `1px solid ${color}33`,
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 12, color: color, lineHeight: 1.55 }}>
              {selectedMineral.notes}
            </span>
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: 16 }} />
      </div>
    </>
  )
}
