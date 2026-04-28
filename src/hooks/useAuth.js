// useAuth.js — Auth state listener. Call once at the App root.
// Uses legalFetchedFor ref so onAuthStateChange tab-refocus events
// don't re-fetch the profile when the user ID hasn't changed.
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'
import useMapStore from '../store/mapStore'

export function useAuth() {
  const { setUser, setIsPro, setSubscriptionStatus, setLegalAccepted, setShowLegalDisclaimer } =
    useUserStore()
  const legalFetchedFor = useRef(null)

  useEffect(() => {
    // Handle existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) handleSignedIn(session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        handleSignedIn(session.user)
      } else {
        setUser(null)
        legalFetchedFor.current = null
        // Only clear subscription state on genuine sign-out or when online.
        // If offline, the session was lost due to JWT expiry — persisted Pro
        // status is the best data available; do not overwrite it.
        if (event === 'SIGNED_OUT' || navigator.onLine) {
          setIsPro(false)
          setSubscriptionStatus('free')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignedIn(user) {
    // If we've already fetched for this user ID, just sync user into the store.
    // legalAccepted is already correct from the first fetch — no flash risk.
    if (legalFetchedFor.current === user.id) {
      setUser(user)
      return
    }
    legalFetchedFor.current = user.id

    // Fetch profile BEFORE calling setUser so that when user becomes non-null
    // in the store, legalAccepted is already set correctly and the modal gate
    // never sees user=set + legalAccepted=false at the same time.
    const { data: profile } = await supabase
      .from('profiles')
      .select('legal_accepted, is_pro')
      .eq('id', user.id)
      .single()

    if (profile?.legal_accepted) {
      setLegalAccepted(true)
    }
    if (profile && !profile.legal_accepted) {
      setShowLegalDisclaimer(true)
    }
    if (profile?.is_pro) {
      setIsPro(true)
    }

    // Clear any guest-session waypoints so they don't mix with saved Supabase waypoints
    useMapStore.getState().clearGuestWaypoints()

    // Now safe to expose the user — legal state is already hydrated
    setUser(user)

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
