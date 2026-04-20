import { useState } from 'react'
import { useCourses, useProgress } from '../hooks/useLearn'
import useUserStore from '../store/userStore'
import CourseDetail from './learn/CourseDetail'
import ChapterReader from './learn/ChapterReader'
import CourseCertificate from './learn/CourseCertificate'

function CourseCard({ course, completedCount, onTap }) {
  const pct = course.chapter_count > 0 ? Math.round((completedCount / course.chapter_count) * 100) : 0

  return (
    <div
      onClick={onTap}
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-card-border)',
        borderRadius: 16,
        padding: '20px',
        margin: '0 16px 12px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: 'var(--color-card-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          flexShrink: 0,
        }}>
          {course.cover_emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {course.title}
            </div>
            {course.is_pro && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#E8C96A',
                border: '1px solid rgba(232,201,106,0.4)',
                borderRadius: 4,
                padding: '2px 5px',
                flexShrink: 0,
              }}>
                PRO
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4 }}>
            {course.chapter_count} chapters · {course.module}
          </div>
        </div>
      </div>
      <div style={{ background: 'var(--color-base)', borderRadius: 6, height: 4, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ background: '#E8C96A', height: '100%', width: `${pct}%`, transition: 'width 400ms ease' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
        {pct === 0 ? 'Not started' : pct === 100 ? '✓ Complete' : `${pct}% complete — ${completedCount} of ${course.chapter_count} chapters`}
      </div>
    </div>
  )
}

function ProgressSummaryCard({ courses, completedIds }) {
  const totalChapters = courses.reduce((s, c) => s + c.chapter_count, 0)
  const completedChapters = completedIds.size
  const completedCourses = courses.filter(c => {
    // We don't have per-course chapter ids here — use percentage proxy
    return false // simplified: just show total chapters
  }).length

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1E2240, #252840)',
      border: '1px solid rgba(232,201,106,0.2)',
      borderRadius: 16,
      padding: '20px',
      margin: '12px 16px',
      display: 'flex',
      gap: 0,
    }}>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#E8C96A' }}>{completedChapters}</div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>Chapters Done</div>
      </div>
      <div style={{ width: 1, background: 'var(--color-card-border)' }} />
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#E8C96A' }}>{totalChapters}</div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>Total Chapters</div>
      </div>
      <div style={{ width: 1, background: 'var(--color-card-border)' }} />
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#E8C96A' }}>
          {totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0}%
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>Complete</div>
      </div>
    </div>
  )
}

export default function LearnView() {
  const { courses, loading } = useCourses()
  const { completedIds, certificates } = useProgress()
  const { isPro, setShowUpgradeSheet } = useUserStore()

  const [screen, setScreen] = useState('library') // 'library' | 'course' | 'chapter' | 'certificate'
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0)
  const [chapters, setChapters] = useState([])

  function openCourse(course) {
    if (course.is_pro && !isPro) { setShowUpgradeSheet(true); return }
    setSelectedCourse(course)
    setScreen('course')
  }

  function openChapter(chapter, allChapters) {
    const list = allChapters && allChapters.length > 0 ? allChapters : chapters
    const idx = list.findIndex(c => c.id === chapter.id)
    setSelectedChapter(chapter)
    setSelectedChapterIndex(idx >= 0 ? idx : 0)
    if (list.length > 0) setChapters(list)
    setScreen('chapter')
  }

  function nextChapter() {
    const next = chapters[selectedChapterIndex + 1]
    if (next) {
      setSelectedChapter(next)
      setSelectedChapterIndex(i => i + 1)
    } else {
      setScreen('course')
    }
  }

  function getCompletedForCourse(course) {
    // We need chapter IDs per course — use completedIds cross-referenced
    // Since we don't load chapters here, proxy with stored count
    return completedIds.size > 0 ? Math.min(completedIds.size, course.chapter_count) : 0
  }

  if (screen === 'chapter' && selectedChapter && selectedCourse) {
    return (
      <ChapterReader
        chapter={selectedChapter}
        course={selectedCourse}
        onBack={() => setScreen('course')}
        onNext={nextChapter}
        isLast={selectedChapterIndex === chapters.length - 1}
      />
    )
  }

  if (screen === 'certificate' && selectedCourse) {
    return (
      <CourseCertificate
        course={selectedCourse}
        onBack={() => setScreen('course')}
      />
    )
  }

  if (screen === 'course' && selectedCourse) {
    return (
      <CourseDetail
        course={selectedCourse}
        onBack={() => setScreen('library')}
        onSelectChapter={(ch, allChapters) => openChapter(ch, allChapters || chapters)}
        onShowCertificate={() => setScreen('certificate')}
        onChaptersLoaded={setChapters}
      />
    )
  }

  // Library screen
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--color-base)',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        overflowY: 'auto',
        flex: 1,
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      }}>
        <div style={{ padding: '8px 16px 4px', fontSize: 22, fontWeight: 800, color: '#E8C96A' }}>
          Learn
        </div>
        <div style={{ padding: '0 16px 4px', fontSize: 13, color: 'var(--color-muted)' }}>
          Courses and guides for Irish outdoor explorers
        </div>

        {!loading && courses.length > 0 && (
          <ProgressSummaryCard courses={courses} completedIds={completedIds} />
        )}

        <div style={{ padding: '16px 16px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
          COURSE LIBRARY
        </div>

        {loading ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
            Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 14 }}>
            No courses available yet.
          </div>
        ) : (
          courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              completedCount={getCompletedForCourse(course)}
              onTap={() => openCourse(course)}
            />
          ))
        )}
      </div>
    </div>
  )
}
