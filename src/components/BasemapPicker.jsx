// BasemapPicker.jsx — Visual thumbnail basemap selector + 2D/3D terrain toggle.
// Slides up from the bottom when mapStore.basemapPickerOpen === true.
import useMapStore from '../store/mapStore'

const BASEMAP_CARDS = [
  { id: 'outdoor',   label: 'Outdoor',   thumbColor: '#1E3028' },
  { id: 'satellite', label: 'Satellite', thumbColor: '#1A1D2E' },
  { id: 'topo',      label: 'Topo',      thumbColor: '#252840' },
]

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 500,
    display: 'flex',
    alignItems: 'flex-end',
    background: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    width: '100%',
    background: '#111214',
    borderTop: '1px solid #2E3035',
    borderRadius: '16px 16px 0 0',
    padding: '0 0 env(safe-area-inset-bottom, 16px)',
  },
  handle: {
    width: 32,
    height: 4,
    background: '#2E3035',
    borderRadius: 2,
    margin: '12px auto 0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px 8px',
  },
  title: {
    fontSize: 16,
    fontWeight: 500,
    color: '#E8EAF0',
    margin: 0,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid #2E3035',
    background: 'transparent',
    color: '#6B7280',
    fontSize: 18,
    lineHeight: 1,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsRow: {
    display: 'flex',
    gap: 12,
    padding: '8px 16px 16px',
  },
  card: (active) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    padding: '8px 6px',
    borderRadius: 12,
    border: active ? '2px solid #E8C96A' : '1.5px solid #2E3035',
    background: active ? 'rgba(232,201,106,0.06)' : 'transparent',
    transition: 'border-color 120ms, background 120ms',
  }),
  thumb: (color) => ({
    width: '100%',
    aspectRatio: '4/3',
    borderRadius: 8,
    background: color,
    overflow: 'hidden',
    position: 'relative',
  }),
  thumbLabel: (active) => ({
    fontSize: 12,
    fontWeight: 500,
    color: active ? '#E8C96A' : '#E8EAF0',
    letterSpacing: '0.02em',
  }),
  divider: {
    height: 1,
    background: '#2E3035',
    margin: '0 16px',
  },
  terrainRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 16px',
  },
  terrainLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  terrainTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: '#E8EAF0',
  },
  terrainSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  toggle: (active) => ({
    width: 44,
    height: 26,
    borderRadius: 13,
    background: active ? '#E8C96A' : '#2E3035',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 180ms',
    flexShrink: 0,
  }),
  toggleKnob: (active) => ({
    position: 'absolute',
    top: 3,
    left: active ? 21 : 3,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: active ? '#111214' : '#6B7280',
    transition: 'left 180ms, background 180ms',
  }),
}

export default function BasemapPicker() {
  const { basemapPickerOpen, setBasemapPickerOpen, basemap, setBasemap, is3D, setIs3D } =
    useMapStore()

  if (!basemapPickerOpen) return null

  return (
    <div style={styles.overlay} onClick={() => setBasemapPickerOpen(false)}>
      <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.handle} />

        <div style={styles.header}>
          <p style={styles.title}>Basemap</p>
          <button style={styles.closeBtn} onClick={() => setBasemapPickerOpen(false)}>
            ×
          </button>
        </div>

        <div style={styles.cardsRow}>
          {BASEMAP_CARDS.map(({ id, label, thumbColor }) => {
            const active = basemap === id
            return (
              <div
                key={id}
                style={styles.card(active)}
                onClick={() => {
                  setBasemap(id)
                  setBasemapPickerOpen(false)
                }}
              >
                <div style={styles.thumb(thumbColor)}>
                  <ThumbPattern id={id} />
                </div>
                <span style={styles.thumbLabel(active)}>{label}</span>
              </div>
            )
          })}
        </div>

        <div style={styles.divider} />

        <div style={styles.terrainRow}>
          <div style={styles.terrainLabel}>
            <span style={styles.terrainTitle}>3D Terrain</span>
            <span style={styles.terrainSub}>Two-finger tilt to rotate</span>
          </div>
          <button
            style={styles.toggle(is3D)}
            onClick={() => setIs3D(!is3D)}
            aria-label={is3D ? 'Disable 3D terrain' : 'Enable 3D terrain'}
          >
            <div style={styles.toggleKnob(is3D)} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Simple SVG pattern overlays to differentiate the thumbnail cards visually
function ThumbPattern({ id }) {
  if (id === 'outdoor') {
    return (
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}
        viewBox="0 0 80 60"
        preserveAspectRatio="none"
      >
        <polyline points="0,45 15,30 25,38 38,18 50,28 65,12 80,22" fill="none" stroke="#4BE87A" strokeWidth="2" />
        <polyline points="0,55 20,42 35,50 55,35 80,40" fill="none" stroke="#4BE87A" strokeWidth="1" strokeOpacity="0.5" />
      </svg>
    )
  }
  if (id === 'satellite') {
    return (
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.25 }}
        viewBox="0 0 80 60"
        preserveAspectRatio="none"
      >
        <rect x="10" y="8" width="28" height="20" rx="2" fill="#5B8FD4" />
        <rect x="45" y="15" width="22" height="16" rx="2" fill="#4A9E6B" />
        <rect x="5" y="35" width="35" height="18" rx="2" fill="#3B3B3B" />
        <rect x="46" y="36" width="28" height="15" rx="2" fill="#5B4A2E" />
      </svg>
    )
  }
  if (id === 'topo') {
    return (
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.3 }}
        viewBox="0 0 80 60"
        preserveAspectRatio="none"
      >
        <ellipse cx="40" cy="30" rx="30" ry="22" fill="none" stroke="#C47AC0" strokeWidth="1.5" />
        <ellipse cx="40" cy="30" rx="20" ry="14" fill="none" stroke="#C47AC0" strokeWidth="1.5" />
        <ellipse cx="40" cy="30" rx="10" ry="7" fill="none" stroke="#C47AC0" strokeWidth="1.5" />
      </svg>
    )
  }
  return null
}
