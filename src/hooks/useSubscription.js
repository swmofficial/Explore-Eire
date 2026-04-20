// useSubscription.js — Query subscriptions table on mount, keep isPro in sync.
// useAuth already handles the initial fetch on sign-in; this hook is for
// explicit re-checks (e.g. after returning from Stripe Checkout).
import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

export function useSubscription() {
  const { user, setIsPro, setSubscriptionStatus } = useUserStore()

  const refresh = useCallback(async () => {
    if (!user) return

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows — user has no subscription record yet
      console.error('useSubscription fetch error:', error.message)
      return
    }

    if (sub) {
      setSubscriptionStatus(sub.status)
      setIsPro(sub.status === 'active')
    } else {
      setSubscriptionStatus('free')
      setIsPro(false)
    }
  }, [user, setIsPro, setSubscriptionStatus])

  // Run on mount and whenever the user changes
  useEffect(() => {
    refresh()
  }, [refresh])

  return { refresh }
}
