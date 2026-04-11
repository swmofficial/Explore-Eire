// useAuth.js — Auth state listener. Call once at the App root.
// Uses legalFetchedFor ref so onAuthStateChange tab-refocus events
// don't re-fetch the profile when the user ID hasn't changed.
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

export function useAuth() {
  const { setUser, setIsPro, setSubscriptionStatus, setLegalAccepted, setShowLegalDisclaimer } =
    useUserStore()
  const legalFetchedFor = useRef(null)

  useEffect(() => {
    // Handle existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleSignedIn(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleSignedIn(session.user)
      } else {
        setUser(null)
        setIsPro(false)
        setSubscriptionStatus('free')
        legalFetchedFor.current = null
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignedIn(user) {
    setUser(user)

    // Avoid re-fetching profile on tab refocus when user ID unchanged
    if (legalFetchedFor.current === user.id) return
    legalFetchedFor.current = user.id

    // Fetch profile for legal_accepted
    const { data: profile } = await supabase
      .from('profiles')
      .select('legal_accepted')
      .eq('id', user.id)
      .single()

    if (profile && !profile.legal_accepted) {
      setShowLegalDisclaimer(true)
    }
    if (profile?.legal_accepted) {
      setLegalAccepted(true)
    }

    // Fetch subscription status
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single()

    if (sub) {
      setSubscriptionStatus(sub.status)
      setIsPro(sub.status === 'active')
    }
  }
}
