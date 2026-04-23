// HelpSupport — FAQ accordion + Contact Us tab
import { useState } from 'react'

const FAQ_CATEGORIES = [
  {
    title: 'General',
    items: [
      { q: 'What is Explore Éire?', a: 'Explore Éire is Ireland\'s all-in-one outdoor platform covering gold prospecting, field sports, hiking, archaeology, and coastal exploration. One subscription, five modules.' },
      { q: 'How does the app work?', a: 'Open the app, choose a module from the dashboard, and explore the map with specialist data layers. Tap any marker to see details, save waypoints, track sessions, and log finds.' },
      { q: 'Is it free?', a: 'Yes — the free tier gives access to basic gold data and your first course chapter. Upgrade to Pro (€9.99/month or €79/year) for unlimited layers, offline maps, and all courses.' },
    ],
  },
  {
    title: 'Account',
    items: [
      { q: 'How do I sign up?', a: 'Tap the Profile tab and select "Create Free Account", or go to Settings and tap "Sign In". You can sign up with email or Google.' },
      { q: 'How do I change my email or password?', a: 'Go to Settings → Profile to change your email, or Settings → Password to update your password. Both flows require verifying your current credentials first.' },
      { q: 'How do I cancel my subscription?', a: 'Go to Settings → Premium → Manage Subscription. Your access continues until the end of the current billing period.' },
    ],
  },
  {
    title: 'Map & Data',
    items: [
      { q: 'What do the map layers show?', a: 'The Prospecting module shows 7 tiers of gold sample data, mineral localities, geochemistry, bedrock geology, and rainfall radar. Pro layers include detailed WMS geological overlays.' },
      { q: 'Where does the gold data come from?', a: 'All geochemical and geological data is sourced from the Geological Survey of Ireland (GSI) via public APIs and WMS services.' },
      { q: 'How accurate is it?', a: 'Sample locations are accurate to grid-square level. Use them as prospecting indicators, not exact GPS coordinates. Always verify on the ground.' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { q: 'Can I prospect anywhere in Ireland?', a: 'No. You must have landowner permission to access private land. Mineral rights in Ireland are largely state-owned — prospecting for gold without a licence may be illegal.' },
      { q: 'What permissions do I need?', a: 'For casual prospecting (panning in rivers): landowner permission for access. For significant excavation: a mineral prospecting licence from the DCCAE. Always check before you dig.' },
      { q: 'What are the rules on removing material?', a: 'Removing significant quantities of mineral material without a licence is illegal under the Minerals Development Act. Casual panning of river gravels is generally tolerated but not explicitly permitted.' },
    ],
  },
  {
    title: 'Prospecting',
    items: [
      { q: "I'm a beginner — where do I start?", a: "Open the Learning Hub and start with the 'Beginner Panning' course. Then switch to the Prospecting map layer and look for Tier 6/7 gold samples near accessible rivers." },
      { q: 'How do I read the geological data?', a: 'Tier 1–5 are high-concentration gold samples (Pro). Tier 6–7 are free-tier indicators. The geochemistry WMS layer shows soil anomalies — yellow/orange patches are elevated gold concentrations.' },
      { q: 'What equipment do I need?', a: 'To start: a gold pan (10–12 inch), a classifier/sieve, rubber gloves, and waterproof boots. The Learning Hub course covers equipment selection in detail.' },
    ],
  },
]

const CONTACT_ITEMS = [
  { icon: '✉️', label: 'Email', href: 'mailto:support@exploreeire.ie', display: 'support@exploreeire.ie' },
  { icon: '💬', label: 'WhatsApp', href: 'https://wa.me/353000000000', display: 'Message us on WhatsApp' },
  { icon: '🌐', label: 'Website', href: 'https://exploreeire.ie', display: 'exploreeire.ie' },
  { icon: '📸', label: 'Instagram', href: 'https://instagram.com/exploreeire', display: '@exploreeire' },
  { icon: '🎵', label: 'TikTok', href: 'https://tiktok.com/@exploreeire', display: '@exploreeire' },
  { icon: '👍', label: 'Facebook', href: 'https://facebook.com/exploreeire', display: 'Explore Éire' },
]

function AccordionCategory({ title, items }) {
  const [open, setOpen] = useState(false)
  const [openItem, setOpenItem] = useState(null)

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      {/* Category header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{title}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
          <path d="M4 6l4 4 4-4" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ paddingBottom: 8 }}>
          {items.map((item, i) => (
            <div key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setOpenItem(openItem === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                  gap: 12, padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.4 }}>{item.q}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2, transform: openItem === i ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
                  <path d="M3 5l4 4 4-4" stroke="var(--color-muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {openItem === i && (
                <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HelpSupport({ onBack }) {
  const [tab, setTab] = useState('faq')

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', background: 'var(--color-base)', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-accent)', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Help & Support</span>
        <div style={{ width: 28 }} />
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', background: 'var(--color-surface)', borderRadius: 10, padding: 3, margin: '16px 16px 0' }}>
        {['faq', 'contact'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: tab === t ? 'var(--color-base)' : 'transparent',
              color: tab === t ? 'var(--color-text)' : 'var(--color-muted)',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              transition: 'background 150ms, color 150ms',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t === 'faq' ? 'FAQ' : 'Contact Us'}
          </button>
        ))}
      </div>

      {/* ── FAQ tab ── */}
      {tab === 'faq' && (
        <div style={{ margin: '16px 16px 0', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
          {FAQ_CATEGORIES.map(cat => (
            <AccordionCategory key={cat.title} title={cat.title} items={cat.items} />
          ))}
        </div>
      )}

      {/* ── Contact Us tab ── */}
      {tab === 'contact' && (
        <div style={{ margin: '16px 16px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            We're a small team — we read every message. Reach us through any of the channels below.
          </p>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
            {CONTACT_ITEMS.map((item, i) => (
              <a
                key={i}
                href={item.href}
                target={item.href.startsWith('mailto') ? '_self' : '_blank'}
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px',
                  borderBottom: i < CONTACT_ITEMS.length - 1 ? '1px solid var(--color-border)' : 'none',
                  textDecoration: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 1 }}>{item.display}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3l4 4-4 4" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
