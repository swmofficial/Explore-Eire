import { useState } from 'react'

export default function CourseQuiz({ quiz, chapterTitle, onBack, onComplete }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [showSummary, setShowSummary] = useState(false)

  const q = quiz[index]
  const isCorrect = selected === q?.answer
  const isLast = index === quiz.length - 1

  function handleConfirm() {
    if (selected === null) return
    setConfirmed(true)
    if (isCorrect) setCorrect(c => c + 1)
  }

  function handleNext() {
    if (isLast) {
      setShowSummary(true)
    } else {
      setIndex(i => i + 1)
      setSelected(null)
      setConfirmed(false)
    }
  }

  const finalScore = isLast && confirmed ? correct + (isCorrect ? 0 : 0) : correct
  const totalScore = isLast && confirmed ? (isCorrect ? correct + 1 : correct) : correct

  if (showSummary) {
    const pct = Math.round((totalScore / quiz.length) * 100)
    const passed = pct >= 60

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-base)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        gap: 16,
      }}>
        <div style={{ fontSize: 56 }}>{passed ? '🎉' : '📖'}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', textAlign: 'center' }}>
          {passed ? 'Quiz Passed!' : 'Keep Learning'}
        </div>
        <div style={{
          fontSize: 48,
          fontWeight: 800,
          color: '#E8C96A',
        }}>
          {pct}%
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-muted)', textAlign: 'center' }}>
          {totalScore} of {quiz.length} correct
        </div>
        <button
          onClick={() => onComplete(pct)}
          style={{
            marginTop: 12,
            padding: '16px 40px',
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
          Continue
        </button>
      </div>
    )
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
            <path d="M12 4l-6 6 6 6" stroke="#E8EAF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E8C96A' }}>Quiz</div>
          <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
            Question {index + 1} of {quiz.length}
          </div>
        </div>
      </div>

      {/* Question */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1.5, marginBottom: 28 }}>
          {q.question}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map((opt, i) => {
            let bg = 'var(--color-card)'
            let border = '1px solid var(--color-card-border)'
            let color = 'var(--color-primary)'

            if (confirmed) {
              if (i === q.answer) { bg = '#1E3A2A'; border = '1px solid #4CAF50'; color = '#4CAF50' }
              else if (i === selected && i !== q.answer) { bg = '#3A1E1E'; border = '1px solid #E53935'; color = '#E53935' }
            } else if (i === selected) {
              border = '1px solid #E8C96A'
            }

            return (
              <button
                key={i}
                onClick={() => !confirmed && setSelected(i)}
                style={{
                  background: bg,
                  border,
                  borderRadius: 12,
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: 14,
                  color,
                  fontWeight: i === selected ? 600 : 400,
                  cursor: confirmed ? 'default' : 'pointer',
                  lineHeight: 1.5,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 150ms ease',
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
        {confirmed && (
          <div style={{
            marginTop: 20,
            padding: '14px 16px',
            background: isCorrect ? '#1E3A2A' : '#3A1E1E',
            borderRadius: 12,
            fontSize: 14,
            color: isCorrect ? '#4CAF50' : '#E53935',
            fontWeight: 600,
          }}>
            {isCorrect ? '✓ Correct!' : `✗ The correct answer is: ${q.options[q.answer]}`}
          </div>
        )}
      </div>

      {/* Button */}
      <div style={{
        padding: '16px 24px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        flexShrink: 0,
        borderTop: '1px solid var(--color-card-border)',
      }}>
        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={selected === null}
            style={{
              width: '100%',
              padding: '16px',
              background: selected !== null ? '#E8C96A' : 'var(--color-card)',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              color: selected !== null ? '#1A1D2E' : 'var(--color-muted)',
              cursor: selected !== null ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
              transition: 'all 150ms ease',
            }}
          >
            Check Answer
          </button>
        ) : (
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
            {isLast ? 'See Results →' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  )
}
