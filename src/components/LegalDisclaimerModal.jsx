// LegalDisclaimerModal.jsx — Full screen legal disclaimer, first login only.
// Shown when userStore.showLegalDisclaimer === true (set by useAuth when
// profiles.legal_accepted === false). Never shown again after acceptance.
// Accept button is locked until the user scrolls to the bottom and ticks the checkbox.
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

const LEGAL_SECTIONS = [
  {
    id: 'two-day-rule',
    title: 'The Two-Day Rule',
    body: 'Under Section 8 of the Minerals Development Act 2017, recreational prospecting without a licence is permitted for up to 2 consecutive days at any one location. You must not return to the same site within a reasonable period. For any extended or repeated activity, you must obtain the appropriate licence from the Department of the Environment, Climate and Communications (decc.gov.ie).',
  },
  {
    id: 'land-access',
    title: 'Land Access',
    body: 'The majority of land in Ireland is privately owned. There is no general right to roam in Irish law. You must obtain the explicit permission of the landowner before accessing private land. Failure to do so constitutes trespass. Explore Eire does not grant any right of access to land shown on this map.',
  },
  {
    id: 'protected-areas',
    title: 'Protected Areas',
    body: 'Many areas across Ireland are designated as Special Areas of Conservation (SACs), Special Protection Areas (SPAs), Natural Heritage Areas (NHAs), or National Parks. Prospecting and ground disturbance in these areas may be prohibited or restricted. You must check npws.ie before undertaking any activity in or near these sites.',
  },
  {
    id: 'archaeological-sites',
    title: 'Archaeological Sites',
    body: 'It is a criminal offence under the National Monuments Acts to disturb, damage, or interfere with a Recorded Monument or any archaeological object. This includes use of metal detectors at such sites. All archaeological data shown in this app is strictly informational. You must check maps.archaeology.ie and obtain any required consent before undertaking any ground disturbance near archaeological sites.',
  },
  {
    id: 'mineral-licences',
    title: 'Active Mineral Licences',
    body: 'Some areas may be subject to active mineral exploration licences held by prospecting companies. Working within a licenced area without authorisation may infringe on those rights. You should check decc.gov.ie for active licence areas before commencing any prospecting activity.',
  },
  {
    id: 'waterways',
    title: 'Waterways',
    body: 'River beds and river banks in Ireland may be privately owned or under the control of statutory bodies such as Inland Fisheries Ireland (IFI). While recreational gold panning is generally tolerated in some rivers, you should confirm ownership and seek permission where required. Do not disturb river beds, banks, or aquatic habitats.',
  },
  {
    id: 'foreshore',
    title: 'Foreshore',
    body: 'The intertidal zone (the area between high and low water marks on beaches and coastlines) is State property under the Foreshore Act 1933. Removing material from the foreshore, including sand, gravel, minerals, or fossils, may require a foreshore licence from the Department of Housing, Local Government and Heritage.',
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer',
    body: 'Explore Eire provides geological, geochemical, and geographical data for informational purposes only. All data is sourced from public datasets including those published by Geological Survey Ireland (GSI) under a CC BY 4.0 licence. The presence of data on this map does not imply any right of access, right to prospect, or right to remove material. You are solely responsible for verifying all necessary permissions before undertaking any activity. Explore Eire accepts no liability for trespass, environmental damage, damage to property or habitats, or breach of any statutory provision or licence condition.',
  },
]

export default function LegalDisclaimerModal() {
  const { showLegalDisclaimer, setShowLegalDisclaimer, setLegalAccepted, user } = useUserStore()
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const scrollRef = useRef(null)

  if (!showLegalDisclaimer) return null

  function handleScroll() {
    const el = scrollRef.current
    if (!el || hasScrolledToBottom) return
    // 16px threshold for floating-point rounding
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 16) {
      setHasScrolledToBottom(true)
    }
  }

  async function handleAccept() {
    if (!checked || saving) return
    setSaving(true)
    if (user) {
      await supabase
        .from('profiles')
        .update({
          legal_accepted: true,
          legal_accepted_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }
    setLegalAccepted(true)
    setShowLegalDisclaimer(false)
    setSaving(false)
  }

  const canAccept = hasScrolledToBottom && checked

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--color-base)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        animation: 'backdropFadeIn 200ms ease-out',
      }}
    >
      {/* Fixed header */}
      <div
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#E8C96A',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#E8C96A',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Legal Disclaimer
          </span>
        </div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--color-primary)',
            margin: '0 0 6px',
            lineHeight: 1.3,
          }}
        >
          Your Legal Responsibilities
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
          Read all sections and scroll to the bottom to continue.
        </p>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '20px 24px 0',
        }}
      >
        {LEGAL_SECTIONS.map((section, i) => (
          <div
            key={section.id}
            style={{ marginBottom: i < LEGAL_SECTIONS.length - 1 ? 24 : 0 }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-primary)',
                margin: '0 0 6px',
              }}
            >
              {i + 1}. {section.title}
            </h2>
            <p
              style={{
                fontSize: 14,
                color: 'var(--color-muted)',
                margin: 0,
                lineHeight: 1.65,
              }}
            >
              {section.body}
            </p>
          </div>
        ))}

        {/* Attribution + footer note */}
        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            paddingBottom: 24,
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-muted)',
              margin: '0 0 8px',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}
          >
            Contains Irish Public Sector Data (Geological Survey Ireland) licensed under CC BY 4.0.
          </p>
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-muted)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            This is a summary for informational purposes only and does not constitute legal advice.
          </p>
        </div>
      </div>

      {/* Fixed footer — checkbox + CTA */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          flexShrink: 0,
        }}
      >
        {/* Scroll-to-bottom nudge */}
        {!hasScrolledToBottom && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginBottom: 14,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M7 2v8M4 7l3 3 3-3"
                stroke="var(--color-muted)"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              Scroll to the bottom to continue
            </span>
          </div>
        )}

        {/* Checkbox row */}
        <div
          role="checkbox"
          aria-checked={checked}
          tabIndex={hasScrolledToBottom ? 0 : -1}
          onClick={() => hasScrolledToBottom && setChecked(!checked)}
          onKeyDown={(e) => {
            if (hasScrolledToBottom && (e.key === ' ' || e.key === 'Enter')) {
              e.preventDefault()
              setChecked(!checked)
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            cursor: hasScrolledToBottom ? 'pointer' : 'not-allowed',
            opacity: hasScrolledToBottom ? 1 : 0.4,
            marginBottom: 16,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              border: `1.5px solid ${checked ? '#E8C96A' : 'var(--color-border)'}`,
              background: checked ? 'rgba(232,201,106,0.12)' : 'var(--color-raised)',
              flexShrink: 0,
              marginTop: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'border-color 150ms ease, background 150ms ease',
            }}
          >
            {checked && (
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
                <path
                  d="M1 4.5L4 7.5L10 1"
                  stroke="#E8C96A"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <span style={{ fontSize: 14, color: 'var(--color-primary)', lineHeight: 1.4 }}>
            I understand and accept my legal responsibilities as described above.
          </span>
        </div>

        {/* Accept button */}
        <button
          onClick={handleAccept}
          disabled={!canAccept || saving}
          style={{
            width: '100%',
            height: 52,
            background: canAccept ? '#E8C96A' : 'var(--color-raised)',
            color: canAccept ? '#0A0A0A' : 'var(--color-muted)',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: canAccept ? 'pointer' : 'not-allowed',
            letterSpacing: '-0.01em',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background 200ms ease, color 200ms ease',
          }}
        >
          {saving ? 'Saving…' : 'I Accept — Continue'}
        </button>
      </div>
    </div>
  )
}
