import { useEffect } from 'react'
import { useChapters, useProgress } from '../../hooks/useLearn'

function ChapterRow({ chapter, completed, locked, onTap }) {
  return (
    <div
      onClick={locked ? undefined : onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        borderBottom: '1px solid var(--color-card-border)',
        cursor: locked ? 'default' : 'pointer',
        opacity: locked ? 0.45 : 1,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: completed ? 'var(--color-accent)' : 'var(--color-card)',
        border: completed ? 'none' : '2px solid var(--color-card-border)',
        fontSize: 14,
      }}>
        {completed ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7l3 3 6-6" stroke="var(--color-base)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <span style={{ color: 'var(--color-muted)', fontSize: 12, fontWeight: 700 }}>{chapter.position}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chapter.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>
          {chapter.quiz?.length > 0 ? `${chapter.content?.length ?? 0} pages · Quiz` : `${chapter.content?.length ?? 0} pages`}
        </div>
      </div>
      {!locked && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}

export default function CourseDetail({ course, onBack, onSelectChapter, onShowCertificate, onChaptersLoaded }) {
  const { chapters, loading } = useChapters(course.id)
  const { completedIds, certificates } = useProgress()

  useEffect(() => {
    if (chapters.length > 0 && onChaptersLoaded) onChaptersLoaded(chapters)
  }, [chapters]) // eslint-disable-line react-hooks/exhaustive-deps

  const completedCount = chapters.filter(ch => completedIds.has(ch.id)).length
  const allDone = chapters.length > 0 && completedCount === chapters.length
  const hasCert = certificates.includes(course.id)
  const pct = chapters.length > 0 ? Math.round((completedCount / chapters.length) * 100) : 0

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      background: 'var(--color-base)',
      zIndex: 30,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Back header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--color-base)',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 12,
        paddingLeft: 20,
        paddingRight: 20,
        borderBottom: '1px solid var(--color-card-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4l-6 6 6 6" stroke="var(--color-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {course.title}
        </span>
      </div>

      {/* Hero card */}
      <div style={{ padding: '24px 20px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{course.cover_emoji}</div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)', marginBottom: 8 }}>
          {course.is_pro ? 'PRO · ' : ''}{course.module.toUpperCase()}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          {course.description}
        </div>
        {/* Progress bar */}
        <div style={{ background: 'var(--color-card)', borderRadius: 8, height: 6, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ background: 'var(--color-accent)', height: '100%', width: `${pct}%`, transition: 'width 400ms ease' }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
          {completedCount} of {chapters.length} chapters complete
        </div>
      </div>

      {/* Certificate button */}
      {allDone && (
        <div style={{ padding: '0 20px 16px' }}>
          <button
            onClick={onShowCertificate}
            style={{
              width: '100%',
              padding: '14px',
              background: hasCert ? 'var(--color-card)' : 'linear-gradient(135deg, #B8860B, #E8C96A)',
              border: hasCert ? '2px solid #E8C96A' : 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              color: hasCert ? 'var(--color-accent)' : 'var(--color-base)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {hasCert ? '🏆 View Certificate' : '🏆 Claim Certificate'}
          </button>
        </div>
      )}

      {/* Chapters list */}
      <div style={{ background: 'var(--color-card)', borderRadius: '16px 16px 0 0', flex: 1 }}>
        <div style={{ padding: '16px 20px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
          CHAPTERS
        </div>
        {loading ? (
          <div style={{ padding: 20, color: 'var(--color-muted)', fontSize: 14, textAlign: 'center' }}>Loading...</div>
        ) : (
          chapters.map(ch => (
            <ChapterRow
              key={ch.id}
              chapter={ch}
              completed={completedIds.has(ch.id)}
              locked={false}
              onTap={() => onSelectChapter(ch, chapters)}
            />
          ))
        )}
        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}
