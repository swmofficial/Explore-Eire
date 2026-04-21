import { useEffect } from 'react'
import { useProgress } from '../../hooks/useLearn'
import useUserStore from '../../store/userStore'

function formatDate(isoStr) {
  if (!isoStr) return new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })
  return new Date(isoStr).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CourseCertificate({ course, onBack }) {
  const { user } = useUserStore()
  const { certificates, issueCertificate } = useProgress()

  const issuedAt = null // we don't fetch the date here; issuance is the action
  const displayName = user?.user_metadata?.display_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Prospector'

  useEffect(() => {
    issueCertificate(course.id)
  }, [course.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleShare() {
    const text = `I completed "${course.title}" on Explore Eire! 🏅`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Explore Eire Certificate', text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('Copied to clipboard!')
      }
    } catch {
      // user cancelled or unsupported — silent fail
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--color-base)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 12,
        paddingLeft: 20,
        paddingRight: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--color-card-border)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4l-6 6 6 6" stroke="var(--color-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>Certificate</span>
      </div>

      {/* Certificate card */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--color-card)',
          border: '2px solid #E8C96A',
          borderRadius: 20,
          padding: '36px 28px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Gold corner accents */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 60, height: 60, borderRight: '2px solid rgba(232,201,106,0.3)', borderBottom: '2px solid rgba(232,201,106,0.3)', borderRadius: '0 0 60px 0' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 60, height: 60, borderLeft: '2px solid rgba(232,201,106,0.3)', borderTop: '2px solid rgba(232,201,106,0.3)', borderRadius: '60px 0 0 0' }} />

          <div style={{ fontSize: 48, marginBottom: 12 }}>🏅</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 16 }}>
            Certificate of Completion
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>
            This certifies that
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-accent)', marginBottom: 8 }}>
            {displayName}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>
            has successfully completed
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1.4, marginBottom: 20 }}>
            {course.title}
          </div>
          <div style={{ height: 1, background: 'rgba(232,201,106,0.3)', marginBottom: 16 }} />
          <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
            Explore Eire · {formatDate(issuedAt)}
          </div>
        </div>

        {/* Share button */}
        <button
          onClick={handleShare}
          style={{
            marginTop: 28,
            padding: '16px 40px',
            background: 'var(--color-card)',
            border: '1px solid #E8C96A',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--color-accent)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="18" cy="5" r="3" stroke="var(--color-accent)" strokeWidth="1.5"/>
            <circle cx="6" cy="12" r="3" stroke="var(--color-accent)" strokeWidth="1.5"/>
            <circle cx="18" cy="19" r="3" stroke="var(--color-accent)" strokeWidth="1.5"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Share Achievement
        </button>
      </div>
    </div>
  )
}
