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
      if (!session?.access_token) {
        setIsPro(false)
        setSubscriptionStatus('unauthenticated')
        return false
      }

      const response = await fetch('/api/verify-subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setIsPro(data.isActive)
        setSubscriptionStatus(data.status || (data.isActive ? 'active' : 'free'))
        return data.isActive
      }
      
      // 401 means auth issue, 403 means not premium
      if (response.status === 401 || response.status === 403) {
        const data = await response.json().catch(() => ({}))
        setIsPro(false)
        setSubscriptionStatus(data.status || 'free')
      }
      
      return false
    } catch (error) {
      console.error('Server subscription verification failed:', error)
      // Don't change local state on network errors — preserve UX
      return false
    } finally {
      setIsVerifying(false)
    }
  }, [user, setIsPro, setSubscriptionStatus])