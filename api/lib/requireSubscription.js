import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Server-side subscription verification middleware.
 * Checks if the user has an active subscription before proceeding.
 * 
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{authorized: boolean, error?: string, status?: number}>}
 */
export async function verifySubscription(userId) {
  if (!userId) {
    return { authorized: false, error: 'User ID required', status: 401 }
  }

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Subscription verification error:', error.message)
    return { authorized: false, error: 'Subscription check failed', status: 500 }
  }

  if (!subscription || subscription.status !== 'active') {
    return { authorized: false, error: 'Premium subscription required', status: 403 }
  }

  // Verify subscription hasn't expired (belt and suspenders with Stripe webhooks)
  if (subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end)
    if (periodEnd < new Date()) {
      return { authorized: false, error: 'Subscription expired', status: 403 }
    }
  }

  return { authorized: true }
}

/**
 * Express-style middleware wrapper for API routes.
 * Returns early with 403 if subscription is not active.
 * 
 * @param {Request} req - Must have userId attached (from auth middleware)
 * @param {Response} res
 * @returns {Promise<boolean>} - true if authorized, false if response already sent
 */
export async function requireActiveSubscription(req, res) {
  const userId = req.userId || req.headers['x-user-id']
  
  const result = await verifySubscription(userId)
  
  if (!result.authorized) {
    res.status(result.status).json({ error: result.error })
    return false
  }
  
  return true
}