import { useState, useEffect } from 'react'
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-base)',
        zIndex: 16,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Back button */}
      <div
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          paddingLeft: 8,
          paddingBottom: 4,
          position: 'sticky',
          top: 0,
          background: 'var(--color-base)',
          zIndex: 1,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 44,
            minWidth: 44,
            padding: '0 12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--color-muted)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ← Back
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '8px 20px', flex: 1 }}>
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
    </div>
  )
}
