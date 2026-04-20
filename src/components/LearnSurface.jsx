// SUPERSEDED by LearnView.jsx — this component is no longer used
import { useState } from 'react'
import useModuleStore from '../store/moduleStore'
import { getModule } from '../lib/moduleConfig'
import ArticleView from './ArticleView'

const ARTICLE_STUBS = [
  {
    slug: 'first-prospecting-trip',
    title: 'Your first prospecting trip',
    teaser: 'Everything you need to plan a safe, legal, and rewarding first outing — from kit to location.',
  },
  {
    slug: 'gold-irish-geology',
    title: 'How gold forms in Irish geology',
    teaser: "Ireland\u2019s ancient Caledonian fold belts concentrate gold in predictable geological settings.",
  },
  {
    slug: 'reading-a-stream',
    title: 'Reading a stream — where gold settles',
    teaser: 'Learn the inside bends, bedrock traps, and gravel bars where placer gold accumulates.',
  },
  {
    slug: 'fools-gold',
    title: "Fool's gold and common misconceptions",
    teaser: "Pyrite, chalcopyrite, and mica confuse beginners. Here\u2019s how to tell real gold on sight.",
  },
  {
    slug: 'legal-framework',
    title: 'The legal framework (two-day rule, land access)',
    teaser: 'The Minerals Development Act 2017, the two-day rule, and what you must know before you dig.',
  },
]

function ArticleCard({ title, teaser, accentColor, onTap }) {
  return (
    <div
      onClick={onTap}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        padding: '16px',
        margin: '0 16px 12px',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 10 }}>
        {teaser}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: accentColor }}>Read →</span>
    </div>
  )
}

export default function LearnSurface() {
  const { activeModule } = useModuleStore()
  const [openArticle, setOpenArticle] = useState(null)

  const module = getModule(activeModule)
  const accent = module?.accent ?? '#E8C96A'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-base)',
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 44px)',
          overflowY: 'auto',
          flex: 1,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: accent,
            padding: '20px 16px 8px',
          }}
        >
          Prospecting Guide
        </div>

        {ARTICLE_STUBS.map((article) => (
          <ArticleCard
            key={article.slug}
            title={article.title}
            teaser={article.teaser}
            accentColor={accent}
            onTap={() => setOpenArticle(article.slug)}
          />
        ))}

        <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }} />
      </div>

      {openArticle && (
        <ArticleView slug={openArticle} onBack={() => setOpenArticle(null)} />
      )}
    </div>
  )
}
