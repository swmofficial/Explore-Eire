// useAuth.js — Auth state management via Supabase
// TODO: implement auth state listener, sign in, sign up, sign out, Google OAuth
import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

export function useAuth() {
  const { setUser, setLegalAccepted, setShowLegalDisclaimer } = useUserStore()
  const legalFetchedFor = useRef(null)

  useEffect(() => {
    // TODO: supabase.auth.onAuthStateChange — use legalFetchedFor ref to prevent
    // re-fetch loops when tab refocuses (onAuthStateChange fires on every focus)
  }, [])
}
