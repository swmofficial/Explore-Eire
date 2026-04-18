// LearnSurface.jsx — Educational content surface for each module.
// Renders above the map when activeSurface === 'learn'.
// Content is pulled from a `learn_articles` Supabase table (to be populated separately).
// For now renders a scaffold with placeholder cards so the surface is visually complete.
import useModuleStore from '../store/moduleStore'
import { getModule } from '../lib/moduleConfig'

const ARTICLE_STUBS = [
  {
    title: 'Your first prospecting trip',
    teaser: 'Everything you need to plan a safe, legal, and rewarding first outing — from kit to location.',
  },
  {
    title: 'How gold forms in Irish geology',
    teaser: "Ireland\u2019s ancient Caledonian fold belts concentrate gold in predictable geological settings.",
  },
  {
    title: 'Reading a stream — where gold settles',
    teaser: 'Learn the inside bends, bedrock traps, and gravel bars where placer gold accumulates.',
  },
  {
    title: "Fool's gold and common misconceptions",
    teaser: "Pyrite, chalcopyrite, and mica confuse beginners. Here's how to tell real gold on sight.",
  },
  {
    title: 'The legal framework (two-day rule, land access)',
    teaser: 'The Minerals Development Act 2017, the two-day rule, and what you must know before you dig.',
  },
]

function ArticleCard({ title, teaser, accentColor }) {
  return (
    <div
      onClick={() => console.log('article tapped:', title)}
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
  const { activeSurface, activeModule } = useModuleStore()

  if (activeSurface !== 'learn') return null

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
            key={article.title}
            title={article.title}
            teaser={article.teaser}
            accentColor={accent}
          />
        ))}

        <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }} />
      </div>
    </div>
  )
}
