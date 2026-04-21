import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import useUserStore from '../../store/userStore'
import EmailChangeModal from '../EmailChangeModal'

function PersonIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="11" r="5.5" stroke="var(--color-muted)" strokeWidth="1.8"/>
      <path d="M4 28c0-5.523 5.373-10 12-10s12 4.477 12 10" stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function FieldInput({ label, value, onChange, type = 'text', readOnly = false, hint, action, onAction, locked = false }) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', opacity: locked ? 0.4 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </div>
        {action && !locked && (
          <button
            onClick={onAction}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', padding: '2px 0', WebkitTapHighlightColor: 'transparent' }}
          >
            {action}
          </button>
        )}
      </div>
      {readOnly || locked ? (
        <>
          <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>{value || ' '}</div>
          {hint && <div style={{ fontSize: 11, color: 'var(--color-border)', marginTop: 5 }}>{hint}</div>}
        </>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            borderBottom: '1px solid var(--color-accent)',
            color: 'var(--color-text)', fontSize: 15,
            padding: '4px 0 6px', outline: 'none', fontFamily: 'inherit',
          }}
        />
      )}
    </div>
  )
}

export default function ProfileSettings({ onBack }) {
  const { user, isGuest, setUser } = useUserStore()
  const isLocked = !user || isGuest

  const initialName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || ''
  const initialBio = user?.user_metadata?.bio || ''
  const initialAvatar = user?.user_metadata?.avatar_url || null

  const [displayName, setDisplayName] = useState(initialName)
  const [bio, setBio] = useState(initialBio)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)

  const fileInputRef = useRef(null)

  const isDirty = displayName !== initialName || bio !== initialBio

  async function handleSave() {
    if (!isDirty || isLocked) return
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase.auth.updateUser({
      data: { display_name: displayName, bio },
    })
    setSaving(false)
    if (err) {
      setError(err.message)
    } else if (data?.user) {
      setUser(data.user)
      onBack()
    }
  }

  async function handlePhotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    const previewObjectUrl = URL.createObjectURL(file)
    setAvatarPreview(previewObjectUrl)
    setUploadingPhoto(true)
    setError(null)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `avatars/${user.id}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = urlData?.publicUrl

      const { data: userData, error: updateErr } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      })
      if (updateErr) throw updateErr

      if (userData?.user) setUser(userData.user)
      setAvatarUrl(publicUrl)
    } catch (err) {
      setError('Photo upload failed. Please try again.')
      setAvatarPreview(null)
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const displayAvatar = avatarPreview || avatarUrl

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: 'var(--color-base)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-accent)', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Profile</span>
        {!isLocked ? (
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            style={{
              background: 'none', border: 'none', cursor: isDirty ? 'pointer' : 'default',
              fontSize: 15, fontWeight: 600,
              color: isDirty ? 'var(--color-accent)' : 'var(--color-border)',
              padding: 4,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        ) : (
          <div style={{ width: 44 }} />
        )}
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 0 20px' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', position: 'relative',
          background: 'var(--color-raised)', border: '2px solid var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {displayAvatar ? (
            <img src={displayAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <PersonIcon size={40} />
          )}
          {uploadingPhoto && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          )}
        </div>

        {!isLocked ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: 14, fontWeight: 500, marginTop: 10, WebkitTapHighlightColor: 'transparent', opacity: uploadingPhoto ? 0.5 : 1 }}
            >
              {uploadingPhoto ? 'Uploading…' : 'Change Photo'}
            </button>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 8 }}>Guest Account</div>
        )}
      </div>

      {/* Form card */}
      <div style={{ margin: '0 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
        <FieldInput
          label="Display Name"
          value={isLocked ? 'Guest Account' : displayName}
          onChange={setDisplayName}
          locked={isLocked}
        />
        <FieldInput
          label="Email"
          value={isLocked ? '' : (user?.email || '')}
          readOnly
          action={isLocked ? undefined : 'Change'}
          onAction={() => setShowEmailModal(true)}
          locked={isLocked}
        />
        <div style={{ padding: '14px 16px', opacity: isLocked ? 0.4 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Bio
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder={isLocked ? '' : 'A short intro about yourself…'}
            disabled={isLocked}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: isLocked ? '1px solid var(--color-border)' : '1px solid var(--color-accent)',
              color: 'var(--color-text)', fontSize: 14,
              padding: '4px 0 6px', outline: 'none', fontFamily: 'inherit',
              resize: 'none', lineHeight: 1.5,
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{ margin: '12px 16px 0', color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>
      )}

      {showEmailModal && (
        <EmailChangeModal onClose={() => setShowEmailModal(false)} />
      )}
    </div>
  )
}
