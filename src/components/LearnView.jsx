import { useState } from 'react'
import { useCourses, useProgress } from '../hooks/useLearn'
import useUserStore from '../store/userStore'
import CourseDetail from './learn/CourseDetail'
import ChapterReader from './learn/ChapterReader'
import CourseCertificate from './learn/CourseCertificate'

// Estimated minutes per course (hardcoded alongside data)
const COURSE_MINUTES = {
  'gold-panning-fundamentals': 45,
  'reading-geological-maps': 30,
  'legal-permissions-ireland': 20,
}

function Badge({ type }) {
  if (type === 'progress') return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px',
      borderRadius: 99, background: 'rgba(74,158,107,0.18)',
      color: 'var(--color-success)', border: '1px solid rgba(74,158,107,0.35)',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>In Progress</span>
  )
  if (type === 'pro') return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px',
      borderRadius: 99, background: 'rgba(232,201,106,0.12)',
      color: 'var(--color-accent)', border: '1px solid rgba(232,201,106,0.35)',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>🔒 Pro Only</span>
  )
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px',
      borderRadius: 99, background: 'transparent',
      color: 'var(--color-muted)', border: '1px solid var(--color-border)',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>Not Started</span>
  )
}

function CourseCard({ course, completedCount, onTap, isPro }) {
  const total = course.chapter_count
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0
  const hasProgress = completedCount > 0
  const isLocked = course.is_pro && !isPro
  const mins = COURSE_MINUTES[course.id] ?? '—'

  const badgeType = isLocked ? 'pro' : hasProgress ? 'progress' : 'none'

  return (
    <div
      onClick={onTap}
      style={{
        margin: '0 16px 14px',
        borderRadius: 16,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: isLocked ? '1px solid var(--color-border)' : `4px solid ${hasProgress ? 'var(--color-accent)' : 'var(--color-border)'}`,
        padding: '16px 16px 16px 14px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        opacity: isLocked ? 0.85 : 1,
      }}
    >
      {/* Top row: icon + title + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 22, flexShrink: 0,
          background: 'rgba(232,201,106,0.12)',
          border: '1px solid rgba(232,201,106,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
        }}>
          {course.cover_emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
              {course.title}
            </div>
            <Badge type={badgeType} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
            {total} chapters · ~{mins} min
          </div>
        </div>
      </div>

      {/* Progress section — unlocked courses only */}
      {!isLocked ? (
        <>
          <div style={{ background: 'var(--color-border)', borderRadius: 4, height: 4, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ background: 'var(--color-accent)', height: '100%', width: `${pct}%`, transition: 'width 400ms ease' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              {completedCount} of {total} chapters complete
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>
              {hasProgress ? 'Continue →' : 'Start →'}
            </span>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)' }}>Upgrade to Unlock</span>
        </div>
      )}
    </div>
  )
}

function ProgressSummaryCard({ courses, completedIds }) {
  const totalChapters = courses.reduce((s, c) => s + c.chapter_count, 0)
  const completedChapters = completedIds.size
  const pct = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
  const coursesInProgress = courses.filter(c => {
    const CHAPTERS_MAP = { 'gold-panning-fundamentals': 6, 'reading-geological-maps': 5, 'legal-permissions-ireland': 4 }
    const total = CHAPTERS_MAP[c.id] ?? c.chapter_count
    const done = [...completedIds].filter(id => id.startsWith(c.id.split('-')[0])).length
    return done > 0 && done < total
  }).length

  return (
    <div style={{
      margin: '12px 16px',
      borderRadius: 16,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      padding: '18px 0',
      display: 'flex',
    }}>
      {[
        { value: coursesInProgress || courses.filter(c => !c.is_pro).length, label: 'Courses' },
        { value: `${pct}%`, label: 'Complete' },
        { value: completedChapters, label: 'Chapters Done' },
      ].map((item, i, arr) => (
        <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-accent)', lineHeight: 1.1 }}>{item.value}</div>
          <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>{item.label}</div>
        </div>
      ))}
    </div>
  )
}

export default function LearnView() {
  const { courses } = useCourses()
  const { completedIds, certificates } = useProgress()
  const { isPro, setShowUpgradeSheet } = useUserStore()

  const [screen, setScreen] = useState('library')
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
    const list = allChapters?.length > 0 ? allChapters : chapters
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
    return chapters.length > 0 && selectedCourse?.id === course.id
      ? chapters.filter(ch => completedIds.has(ch.id)).length
      : [...completedIds].filter(id => id.startsWith(course.id.split('-')[0])).length
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

  // ── Library screen ────────────────────────────────────────────────
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 16px 4px' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>Learning Hub</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 3 }}>Master the art of prospecting</div>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, marginTop: 4,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        </div>

        {/* Progress summary */}
        <ProgressSummaryCard courses={courses} completedIds={completedIds} />

        {/* Section label */}
        <div style={{ padding: '8px 16px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
          Available Courses
        </div>

        {/* Course cards */}
        {courses.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            completedCount={getCompletedForCourse(course)}
            onTap={() => openCourse(course)}
            isPro={isPro}
          />
        ))}
      </div>
    </div>
  )
}
