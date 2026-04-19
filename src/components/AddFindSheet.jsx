import { useState, useEffect, useRef } from 'react'
import { useFindsLog } from '../hooks/useFindsLog'
import { useGeolocation } from '../hooks/useGeolocation'
import useMapStore from '../store/mapStore'

const INPUT = {
  width: '100%',
  background: 'var(--color-base)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '11px 13px',
  fontSize: 15,
  color: 'var(--color-primary)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } },
    )
    const json = await res.json()
    const county = json?.address?.county ?? json?.address?.state_district ?? null
    return county ? `Co. ${county.replace(/^County\s+/i, '')}` : null
  } catch {
    return null
  }
}

export default function AddFindSheet({ onClose }) {
  const { addFind } = useFindsLog()
  const { position, getCurrentPosition } = useGeolocation()
  const { addToast } = useMapStore.getState()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [weightG, setWeightG] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [locationLabel, setLocationLabel] = useState('Locating…')
  const [coords, setCoords] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fileRef = useRef(null)

  // Acquire GPS on mount
  useEffect(() => {
    getCurrentPosition()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve coords + label when position arrives
  useEffect(() => {
    if (!position) return
    const lat = position.coords.latitude
    const lng = position.coords.longitude
    setCoords({ lat, lng })
    reverseGeocode(lat, lng).then((label) => {
      setLocationLabel(label ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    })
  }, [position])

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    if (!title.trim()) return
    setSubmitting(true)
    await addFind({
      title: title.trim(),
      description: description.trim() || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
      weight_g: weightG ? parseFloat(weightG) : undefined,
      photoFile,
    })
    addToast({ type: 'success', message: 'Find logged ✓' })
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,0.45)' }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 49,
          background: 'var(--color-surface)',
          borderRadius: '20px 20px 0 0',
          padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 16px)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div style={{ padding: '8px 20px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-primary)' }}>Log a Find</div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 22, color: 'var(--color-muted)', lineHeight: 1,
                padding: 4, WebkitTapHighlightColor: 'transparent',
              }}
            >
              ×
            </button>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              WHAT DID YOU FIND? *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gold colour, quartz float, nugget…"
              style={INPUT}
              autoFocus
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              NOTES
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes, conditions, nearby landmarks…"
              rows={3}
              style={{ ...INPUT, resize: 'none', lineHeight: 1.5 }}
            />
          </div>

          {/* Photo */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              PHOTO
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              style={{ display: 'none' }}
            />
            {photoPreview ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={photoPreview}
                  alt="Find preview"
                  style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, display: 'block' }}
                />
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,0.6)', border: 'none',
                    borderRadius: '50%', width: 22, height: 22,
                    color: '#fff', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--color-base)',
                  border: '1px dashed rgba(255,255,255,0.15)',
                  borderRadius: 10, padding: '11px 14px',
                  fontSize: 14, color: 'var(--color-muted)',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 18 }}>📷</span>
                Take photo
              </button>
            )}
          </div>

          {/* Weight */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              WEIGHT (GRAMS)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={weightG}
              onChange={(e) => setWeightG(e.target.value)}
              placeholder="Optional"
              style={{ ...INPUT, width: 140 }}
            />
          </div>

          {/* Location */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              LOCATION
            </label>
            <div style={{ fontSize: 14, color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📍</span>
              {locationLabel}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
            style={{
              width: '100%',
              padding: '15px 0',
              borderRadius: 14,
              border: 'none',
              background: !title.trim() || submitting ? 'rgba(232,201,106,0.3)' : '#E8C96A',
              color: !title.trim() || submitting ? 'rgba(0,0,0,0.4)' : '#0A0A0A',
              fontSize: 16,
              fontWeight: 700,
              cursor: !title.trim() || submitting ? 'not-allowed' : 'pointer',
              WebkitTapHighlightColor: 'transparent',
              marginBottom: 4,
            }}
          >
            {submitting ? 'Saving…' : 'Log Find'}
          </button>
        </div>
      </div>
    </>
  )
}
