import { useState } from 'react'
import { useProgress } from '../../hooks/useLearn'
import CourseQuiz from './CourseQuiz'

function ProgressDots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '12px 0' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6,
          height: 6,
          borderRadius: 3,
          background: i === current ? '#E8C96A' : i < current ? 'rgba(232,201,106,0.4)' : 'var(--color-card-border)',
          transition: 'all 220ms ease',
        }} />
      ))}
    </div>
  )
}

export default function ChapterReader({ chapter, course, onBack, onNext, isLast }) {
  const pages = chapter.content ?? []
  const hasQuiz = chapter.quiz?.length > 0
  const totalSteps = pages.length + (hasQuiz ? 1 : 0)

  const [pageIndex, setPageIndex] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [done, setDone] = useState(false)
  const { markChapterComplete } = useProgress()

  const isLastPage = pageIndex === pages.length - 1

  function handleNext() {
    if (!isLastPage) {
      setPageIndex(i => i + 1)
    } else if (hasQuiz) {
      setShowQuiz(true)
    } else {
      handleFinish(null)
    }
  }

  function handlePrev() {
    if (showQuiz) { setShowQuiz(false); return }
    if (pageIndex > 0) setPageIndex(i => i - 1)
  }

  async function handleFinish(score) {
    setDone(true)
    await markChapterComplete(chapter.id, course.id, score)
  }

  if (showQuiz) {
    return (
      <CourseQuiz
        quiz={chapter.quiz}
        chapterTitle={chapter.title}
        onBack={() => setShowQuiz(false)}
        onComplete={(score) => handleFinish(score)}
      />
    )
  }

  if (done) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-base)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        gap: 20,
      }}>
        <div style={{ fontSize: 64 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', textAlign: 'center' }}>
          Chapter complete!
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          {chapter.title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320, marginTop: 12 }}>
          {!isLast && (
            <button
              onClick={onNext}
              style={{
                padding: '16px',
                background: '#E8C96A',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                color: '#1A1D2E',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Next Chapter →
            </button>
          )}
          <button
            onClick={onBack}
            style={{
              padding: '16px',
              background: 'var(--color-card)',
              border: '1px solid var(--color-card-border)',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--color-primary)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Back to Course
          </button>
        </div>
      </div>
    )
  }

  const page = pages[pageIndex]
  const currentStep = pageIndex

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--color-base)',
      zIndex: 40,
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
          onClick={pageIndex > 0 ? handlePrev : onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4l-6 6 6 6" stroke="#E8EAF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chapter.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
            Page {pageIndex + 1} of {pages.length}{hasQuiz ? ' · Quiz ahead' : ''}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <ProgressDots total={totalSteps} current={currentStep} />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 24px', WebkitOverflowScrolling: 'touch' }}>
        {page?.type === 'text' && (
          <p style={{
            fontSize: 16,
            lineHeight: 1.75,
            color: 'var(--color-primary)',
            margin: 0,
          }}>
            {page.body}
          </p>
        )}
      </div>

      {/* Next button */}
      <div style={{
        padding: '16px 24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        flexShrink: 0,
        borderTop: '1px solid var(--color-card-border)',
      }}>
        <button
          onClick={handleNext}
          style={{
            width: '100%',
            padding: '16px',
            background: '#E8C96A',
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            color: '#1A1D2E',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {isLastPage && !hasQuiz ? 'Complete Chapter ✓' : isLastPage && hasQuiz ? 'Take Quiz →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
