// LegalDisclaimerModal.jsx — Full screen legal disclaimer, first login only.
// Shown when user is authenticated (not guest) and legalAccepted is false.
// Fetches profiles.legal_accepted from Supabase on mount; skips if already accepted.
// Non-dismissable. Accept button enabled only after checkbox is ticked.
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

const LEGAL_SECTIONS = [
  {
    id: 'two-day-rule',
    title: 'The Two-Day Rule',
    body: 'Section 8 of the Minerals Development Act 2017 permits recreational prospecting at one location for up to two consecutive days without a licence. Beyond this, a licence is required from the Department of the Environment, Climate and Communications.',
  },
  {
    id: 'land-access',
    title: 'Land Access',
    body: 'The majority of land in Ireland is privately owned. You must obtain permission from the landowner before accessing private land. There is no general right to roam in Ireland.',
  },
  {
    id: 'protected-areas',
    title: 'Protected Areas',
    body: 'Special Areas of Conservation (SACs), Special Protection Areas (SPAs), Natural Heritage Areas (NHAs), and National Parks may have restrictions on prospecting or ground disturbance. Check npws.ie before visiting.',
  },
  {
    id: 'archaeological-sites',
    title: 'Archaeological Sites',
    body: 'It is a criminal offence under the National Monuments Acts to disturb a Recorded Monument. Check maps.archaeology.ie before any digging or ground disturbance.',
  },
  {
    id: 'mineral-licences',
    title: 'Active Mineral Licences',
    body: 'Some areas of Ireland are subject to active mineral exploration licences held by third parties. Check decc.gov.ie for current licence areas before prospecting.',
  },
  {
    id: 'waterways',
    title: 'Waterways',
    body: 'The bed and banks of rivers may be privately owned. While recreational panning is generally tolerated, you should confirm access rights with the relevant landowner or Inland Fisheries Ireland.',
  },
  {
    id: 'foreshore',
    title: 'Foreshore',
    body: 'The intertidal zone (beaches and foreshore) is State property under the Foreshore Acts. Removing material in commercial quantities may require a foreshore licence from the Department of Housing.',
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer',
    body: 'Explore Eire provides geological and environmental data for informational purposes only. It is your responsibility to verify all permissions, licences, and access rights before entering any land or waterway. Explore Eire accepts no liability for trespass, environmental damage, or breach of any statutory provision.',
  },
]

export default function LegalDisclaimerModal() {
  const { user, isGuest, legalAccepted, setLegalAccepted } = useUserStore()
  const [checked, setChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const legalFetchedFor = useRef(null)

  // Fetch profile on mount / when user changes — skip if already fetched for this user
  useEffect(() => {
    if (!user || isGuest) return
    if (legalFetchedFor.current === user.id) return
    legalFetchedFor.current = user.id

    async function fetchProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('legal_accepted')
        .eq('id', user.id)
        .single()
      if (data?.legal_accepted === true) {
        setLegalAccepted(true)
      }
    }
    fetchProfile()
  }, [user, isGuest, setLegalAccepted])

  // Only render for authenticated non-guest users who haven't accepted
  if (!user || isGuest || legalAccepted) return null

  async function handleAccept() {
    if (!checked || saving) return
    setSaving(true)
    await supabase
      .from('profiles')
      .upsert({ id: user.id, legal_accepted: true, legal_accepted_at: new Date().toISOString() })
    setLegalAccepted(true)
    setSaving(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#0A0A0A',
        overflowY: 'scroll',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Sticky top section */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: '#0A0A0A',
          zIndex: 1,
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: '#E8C96A',
            marginBottom: 6,
          }}
        >
          Explore Eire
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>
          Before you explore, please read this carefully.
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ padding: 24, paddingBottom: 120 }}>
        {LEGAL_SECTIONS.map((section, i) => (
          <div key={section.id} style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#E8EAF0',
                margin: '0 0 8px',
              }}
            >
              {i + 1}. {section.title}
            </h2>
            <p
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--color-muted)',
                margin: 0,
                lineHeight: 1.65,
              }}
            >
              {section.body}
            </p>
          </div>
        ))}

        {/* Footer note */}
        <p
          style={{
            fontSize: 12,
            color: 'var(--color-muted)',
            fontStyle: 'italic',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          This is a summary for informational purposes only and does not constitute legal advice.
        </p>
      </div>

      {/* Fixed bottom bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#0A0A0A',
          borderTop: '1px solid var(--color-border)',
          padding: '16px 24px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Checkbox row */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            cursor: 'pointer',
            marginBottom: 14,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{
              width: 18,
              height: 18,
              marginTop: 1,
              flexShrink: 0,
              accentColor: '#E8C96A',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: 14, color: 'var(--color-primary)', lineHeight: 1.4 }}>
            I understand and accept my legal responsibilities
          </span>
        </label>

        {/* Accept button */}
        <button
          onClick={handleAccept}
          disabled={!checked || saving}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 12,
            border: 'none',
            fontSize: 16,
            fontWeight: 600,
            cursor: checked && !saving ? 'pointer' : 'not-allowed',
            background: checked ? '#E8C96A' : 'var(--color-raised)',
            color: checked ? '#0A0A0A' : 'var(--color-muted)',
            transition: 'background 200ms ease, color 200ms ease',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {saving ? 'Saving…' : 'Enter Explore Eire'}
        </button>
      </div>
    </div>
  )
}
