export default function PrivacyPolicy({ onBack }) {
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
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>Privacy Policy</span>
        <div style={{ width: 28 }} />
      </div>

      {/* Body */}
      <div style={{ padding: '24px 20px', maxWidth: 600, margin: '0 auto' }}>
        <p style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 24 }}>
          Last updated: April 2026
        </p>

        <Section title="Who We Are">
          Explore Éire is an Irish outdoor platform operated by Explore Éire Ltd. If you have any questions about this policy, contact us at{' '}
          <a href="mailto:support@exploreeire.ie" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>support@exploreeire.ie</a>.
        </Section>

        <Section title="What We Collect">
          We collect only what is needed to run the app:
          {'\n\n'}
          <strong style={{ color: 'var(--color-text)' }}>Account information</strong> — your email address when you create an account, and your display name if you choose to set one.
          {'\n\n'}
          <strong style={{ color: 'var(--color-text)' }}>Usage data</strong> — which features you use (e.g. courses started, waypoints saved) so we can improve the app. This is anonymised where possible.
          {'\n\n'}
          <strong style={{ color: 'var(--color-text)' }}>Location data</strong> — your device GPS is used while the app is open and only when you actively use map or tracking features. We do not collect location in the background.
        </Section>

        <Section title="How We Use It">
          Your data is used solely to provide app functionality — saving waypoints, tracking sessions, recording finds, and delivering your courses. We do not use it for advertising or profiling.
        </Section>

        <Section title="Where It's Stored">
          Your account and app data is stored securely on Supabase (EU region). Supabase is our backend provider and processes data on our behalf under a data processing agreement. We do not sell or share your data with any third party for commercial purposes.
        </Section>

        <Section title="Location Data">
          Location is accessed only when you tap Go & Track, add a waypoint, or use the Find Nearby feature. It is never collected passively. GPS coordinates you record are stored as part of your waypoints and session tracks, which only you can see.
        </Section>

        <Section title="Photos">
          If you attach a photo to a waypoint or find, it is uploaded to our secure storage (Supabase Storage, EU). Photos are private to your account and are not shared publicly.
        </Section>

        <Section title="Your Rights">
          You can delete your account at any time from Settings → Delete Account. This removes your profile and all associated data. You can also contact us at support@exploreeire.ie to request a copy of your data or ask any questions.
        </Section>

        <Section title="Cookies & Analytics">
          The app does not use advertising cookies. We may use minimal analytics (page views only, no fingerprinting) to understand which features are used. No personal data is included in analytics events.
        </Section>

        <Section title="Contact">
          For any privacy-related questions or requests, email{' '}
          <a href="mailto:support@exploreeire.ie" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>support@exploreeire.ie</a>.
          We aim to respond within 5 business days.
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>
        {title}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
        {children}
      </p>
    </div>
  )
}
