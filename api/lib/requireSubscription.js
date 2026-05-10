import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Verify user has active subscription.
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{isActive: boolean, status: string, subscription: object|null}>}
 */
export async function verifySubscription(userId) {
  if (!userId) {
    return { isActive: false, status: 'unauthenticated', subscription: null }
  }

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, stripe_subscription_id')
    .eq('user_id', userId)
    .single()

  if (error || !subscription) {
    return { isActive: false, status: 'free', subscription: null }
  }

  const isActive = subscription.status === 'active'
  
  return {
    isActive,
    status: subscription.status,
    subscription
  }
}

/**
 * Middleware wrapper that requires active subscription.
 * Returns 403 if subscription is not active.
 * @param {Function} handler - The API route handler
 * @returns {Function} Wrapped handler
 */
export function requireSubscription(handler) {
  return async (req, res) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' })
    }

    const token = authHeader.slice(7)
    
    // Verify JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { isActive, status } = await verifySubscription(user.id)
    
    if (!isActive) {
      return res.status(403).json({ 
        error: 'Premium subscription required',
        status 
      })
    }

    // Attach user to request for downstream use
    req.user = user
    req.subscriptionStatus = status
    
    return handler(req, res)
  }
}
