// useSubscription.js — Query subscriptions table on mount, keep isPro in sync.
// useAuth already handles the initial fetch on sign-in; this hook is for
// explicit re-checks (e.g. after returning from Stripe Checkout).
import { useEffect, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import useUserStore from '../store/userStore'

export function useSubscription() {
  const { user, setIsPro, setSubscriptionStatus } = useUserStore()
  const [isVerifying, setIsVerifying] = useState(false)

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
      // Also check if subscription has expired
      const isExpired = sub.current_period_end && 
        new Date(sub.current_period_end) < new Date()
      
      const isActive = sub.status === 'active' && !isExpired
      setSubscriptionStatus(isActive ? 'active' : sub.status)
      setIsPro(isActive)
    } else {
      setSubscriptionStatus('free')
      setIsPro(false)
    }
  }, [user, setIsPro, setSubscriptionStatus])

  /**
   * Server-side verification of subscription status.
   * Use this before performing sensitive premium operations
   * to ensure the user actually has an active subscription.
   * 
   * Note: This is defense-in-depth. The API routes themselves
   * MUST verify subscription status independently.
   * 
   * @returns {Promise<boolean>} true if subscription is active
   */
  const serverVerify = useCallback(async () => {
    if (!user) return false
    
    setIsVerifying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return false

      const response = await fetch('/api/verify-subscription', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setIsPro(data.isActive)
        setSubscriptionStatus(data.status)
        return data.isActive
      }
      
      // 403 means not premium — update local state to match server
      if (response.status === 403) {
        setIsPro(false)
        setSubscriptionStatus('free')
      }
      
      return false
    } catch (error) {
      console.error('Server subscription verification failed:', error)
      return false
    } finally {
      setIsVerifying(false)
    }
  }, [user, setIsPro, setSubscriptionStatus])

  // Run on mount and whenever the user changes
  useEffect(() => {
    refresh()
  }, [refresh])

  return { refresh, serverVerify, isVerifying }
}