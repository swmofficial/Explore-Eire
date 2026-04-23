import { LEGAL_SECTIONS } from '../LegalDisclaimerModal'

export default function TermsOfService({ onBack }) {
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
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Terms of Service</span>
        <div style={{ width: 28 }} />
      </div>

      {/* Body */}
      <div style={{ padding: '24px 20px', maxWidth: 600, margin: '0 auto' }}>
        <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 24 }}>
          Last updated: April 2026. By using Explore Éire you agree to these terms and accept your legal responsibilities as an outdoor explorer in Ireland.
        </p>

        {LEGAL_SECTIONS.map((section, i) => (
          <div key={section.id} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
              {i + 1}. {section.title}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.7, margin: 0 }}>
              {section.body}
            </p>
          </div>
        ))}

        <p style={{ fontSize: 12, color: 'var(--color-muted)', fontStyle: 'italic', marginTop: 8, lineHeight: 1.5 }}>
          This is a summary for informational purposes only and does not constitute legal advice. Contact support@exploreeire.ie with any questions.
        </p>
      </div>
    </div>
  )
}
