import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Verifies that a user has an active premium subscription.
 * @param {string} userId - The authenticated user's ID
 * @returns {Promise<{isActive: boolean, status: string, error?: string}>}
 */
export async function verifySubscription(userId) {
  if (!userId) {
    return { isActive: false, status: 'unauthenticated', error: 'No user ID provided' }
  }

  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Subscription verification error:', error.message)
      return { isActive: false, status: 'error', error: error.message }
    }

    if (!subscription) {
      return { isActive: false, status: 'free' }
    }

    // Check if subscription is active and not expired
    const isExpired = subscription.current_period_end && 
      new Date(subscription.current_period_end) < new Date()
    
    const isActive = subscription.status === 'active' && !isExpired

    return {
      isActive,
      status: isActive ? 'active' : (isExpired ? 'expired' : subscription.status)
    }
  } catch (err) {
    console.error('Subscription verification exception:', err)
    return { isActive: false, status: 'error', error: err.message }
  }
}

/**
 * Express-style middleware for Vercel API routes.
 * Attaches subscription info to req and optionally blocks non-premium users.
 * @param {object} req - Vercel request object
 * @param {object} res - Vercel response object
 * @param {object} options - { requirePremium: boolean }
 * @returns {Promise<{userId: string, subscription: object}|null>} null if blocked
 */
export async function withSubscriptionCheck(req, res, options = { requirePremium: false }) {
  // Extract user ID from Supabase JWT
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (options.requirePremium) {
      res.status(401).json({ error: 'Authentication required' })
      return null
    }
    return { userId: null, subscription: { isActive: false, status: 'unauthenticated' } }
  }

  const token = authHeader.replace('Bearer ', '')
  
  // Verify JWT and extract user ID
  const { createClient: createAuthClient } = await import('@supabase/supabase-js')
  const authClient = createAuthClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )
  
  const { data: { user }, error: authError } = await authClient.auth.getUser(token)
  
  if (authError || !user) {
    if (options.requirePremium) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return null
    }
    return { userId: null, subscription: { isActive: false, status: 'unauthenticated' } }
  }

  const subscription = await verifySubscription(user.id)

  if (options.requirePremium && !subscription.isActive) {
    res.status(403).json({ error: 'Premium subscription required', status: subscription.status })
    return null
  }

  return { userId: user.id, subscription }
}