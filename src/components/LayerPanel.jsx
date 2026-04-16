// LayerPanel.jsx — Right drawer. Layer toggles filtered to active module.
// Width: 80vw, max 320px. Full height. slideInRight 260ms ease-out.
// Pro layers show badge and are disabled for free users.
import useMapStore from '../store/mapStore'
import useModuleStore from '../store/moduleStore'
import useUserStore from '../store/userStore'
import { LAYER_CATEGORIES } from '../lib/layerCategories'
import { getModule } from '../lib/moduleConfig'

// ── Toggle switch ──────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <label
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      {/* Track */}
      <div
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked && !disabled ? '#E8C96A' : 'var(--color-border)',
          transition: 'background 150ms ease',
          position: 'relative',
        }}
      >
        {/* Thumb */}
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: disabled ? 'var(--color-muted)' : 'var(--color-primary)',
            transition: 'left 150ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}
        />
      </div>
    </label>
  )
}

// ── PRO badge ──────────────────────────────────────────────────
function ProBadge() {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: '#C9A84C',
        background: 'rgba(232,201,106,0.15)',
        padding: '2px 5px',
        borderRadius: 4,
        flexShrink: 0,
      }}
    >
      Pro
    </span>
  )
}

// ── Layer row ──────────────────────────────────────────────────
function LayerRow({ layer, visible, onToggle, isPro }) {
  const disabled = layer.pro && !isPro
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        gap: 10,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        style={{
          fontSize: 14,
          color: 'var(--color-primary)',
          fontWeight: 400,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {layer.label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {layer.pro && <ProBadge />}
        <Toggle
          checked={!disabled && (visible ?? false)}
          onChange={() => onToggle(layer.id, layer)}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

// ── Section ────────────────────────────────────────────────────
function LayerSection({ section, layerVisibility, onToggle, isPro, activeMineralCategory }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {/* Section header */}
      <div
        style={{
          padding: '10px 16px 6px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {section.label}
        {section.placeholder && (
          <span style={{ fontSize: 9, color: 'var(--color-border)', fontWeight: 500 }}>
            No data yet
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 2 }} />

      {/* Layer rows */}
      {section.layers.map((layer) => (
        <LayerRow
          key={layer.id}
          layer={layer}
          visible={
            layer.mineralCategory
              ? activeMineralCategory === layer.id
              : (layerVisibility[layer.id] ?? false)
          }
          onToggle={onToggle}
          isPro={isPro}
        />
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function LayerPanel() {
  const {
    layerPanelOpen, setLayerPanelOpen,
    layerVisibility, setLayerVisibility,
    activeMineralCategory, setActiveMineralCategory,
    showWaypoints, setShowWaypoints,
    setShowOfflineManager,
  } = useMapStore()
  const { activeModule } = useModuleStore()
  const { isPro, setShowUpgradeSheet } = useUserStore()

  const categories = LAYER_CATEGORIES[activeModule] || []
  const module = getModule(activeModule)

  function handleToggle(layerId, layer) {
    if (layer?.mineralCategory) {
      // Exclusive selection — toggling an active category turns it off; toggling a new one switches
      setActiveMineralCategory(activeMineralCategory === layerId ? null : layerId)
    } else {
      setLayerVisibility(layerId, !layerVisibility[layerId])
    }
  }

  return (
    <>
      {/* Backdrop */}
      {layerPanelOpen && (
        <div
          onClick={() => setLayerPanelOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 29,
            animation: 'backdropFadeIn 200ms ease-out',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(80vw, 320px)',
          background: 'var(--color-base)',
          borderLeft: '1px solid var(--color-border)',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          transform: layerPanelOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 260ms ease-out',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Module accent dot */}
            {module && (
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: module.accent,
                flexShrink: 0,
              }} />
            )}
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>
              Layers
            </span>
            {module && (
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                · {module.label}
              </span>
            )}
          </div>

          <button
            onClick={() => setLayerPanelOpen(false)}
            aria-label="Close layers"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-muted)',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable layer list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: 8,
            paddingBottom: 24,
          }}
        >
          {/* MY DATA — always shown, top of list */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                padding: '10px 16px 6px',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-muted)',
              }}
            >
              My Data
            </div>
            <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 2 }} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 14, color: 'var(--color-primary)', fontWeight: 400, flex: 1 }}>
                Saved waypoints
              </span>
              <Toggle
                checked={showWaypoints}
                onChange={() => setShowWaypoints(!showWaypoints)}
                disabled={false}
              />
            </div>
          </div>

          {categories.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
              No layers available for this module yet.
            </div>
          ) : (
            categories.map((section) => (
              <LayerSection
                key={section.id}
                section={section}
                layerVisibility={layerVisibility}
                onToggle={handleToggle}
                isPro={isPro}
                activeMineralCategory={activeMineralCategory}
              />
            ))
          )}
        </div>

          {/* Download for offline — bottom of list */}
          <div style={{ marginTop: 4, padding: '8px 16px 16px' }}>
            <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 12 }} />
            <button
              onClick={() => {
                if (!isPro) { setShowUpgradeSheet(true); return }
                setLayerPanelOpen(false)
                setShowOfflineManager(true)
              }}
              style={{
                width: '100%', padding: '11px 14px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-primary)',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <path d="M7.5 1v8M4.5 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 11v1.5a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Download for offline
              </div>
              {!isPro && (
                <span style={{ fontSize: 9, fontWeight: 700, color: '#C9A84C', background: 'rgba(232,201,106,0.15)', padding: '2px 5px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Pro
                </span>
              )}
            </button>
          </div>

        {/* Footer — Pro upsell if not subscribed */}
        {!isPro && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-void)',
              flexShrink: 0,
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--color-muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
              Pro layers include GSI geochemistry, bedrock geology, and boreholes.
            </p>
            <button
              style={{
                width: '100%',
                padding: '10px',
                background: '#E8C96A',
                color: '#0A0A0A',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Upgrade to Explorer
            </button>
          </div>
        )}
      </div>
    </>
  )
}
