import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

function renderMarkdown(md) {
  return md.split(/\n\n+/).map((block, i) => {
    if (block.startsWith('## ')) {
      return (
        <div
          key={i}
          style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)', margin: '24px 0 8px' }}
        >
          {block.slice(3)}
        </div>
      )
    }
    const parts = block.split(/(\*\*[^*]+\*\*)/)
    return (
      <p key={i} style={{ margin: '0 0 14px', lineHeight: 1.65 }}>
        {parts.map((part, j) =>
          part.startsWith('**') ? (
            <strong key={j} style={{ color: 'var(--color-primary)' }}>{part.slice(2, -2)}</strong>
          ) : part
        )}
      </p>
    )
  })
}

export default function ArticleView({ slug, onBack }) {
  const [body, setBody] = useState(null)
  const [title, setTitle] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) return
    supabase
      .from('learn_articles')
      .select('title, body')
      .eq('slug', slug)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('Article not found.')
        } else {
          setTitle(data.title)
          setBody(data.body)
        }
      })
  }, [slug])

  // Portalled to document.body so it escapes any ancestor stacking context
  // (LearnSurface has zIndex:15; CategoryHeader has zIndex:20 — without a portal
  // the back button would be untappable because it's capped by LearnSurface's z-index)
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--color-base)',
        zIndex: 999,
        overflowY: 'scroll',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Back button — fixed above everything, always tappable */}
      <button
        onClick={onBack}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 9999,
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: 44,
          minWidth: 44,
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.6)',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 16,
          fontWeight: 600,
          color: '#fff',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ← Back
      </button>

      {/* Content — top padding clears the fixed back button */}
      <div style={{ padding: '72px 20px 8px' }}>
        {!body && !error && (
          <div style={{ color: 'var(--color-muted)', fontSize: 14, paddingTop: 24 }}>Loading…</div>
        )}
        {error && (
          <div style={{ color: 'var(--color-muted)', fontSize: 14, paddingTop: 24 }}>{error}</div>
        )}
        {body && (
          <>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--color-primary)',
                marginBottom: 20,
                lineHeight: 1.3,
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 15, color: 'var(--color-secondary)' }}>
              {renderMarkdown(body)}
            </div>
          </>
        )}
        <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 32px)' }} />
      </div>
    </div>,
    document.body,
  )
}
