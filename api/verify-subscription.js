import { getUserFromRequest } from './lib/getUserFromRequest.js'
import { verifySubscription } from './lib/requireSubscription.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, error: authError } = await getUserFromRequest(req)
  
  if (!userId) {
    return res.status(401).json({ error: authError || 'Authentication required' })
  }

  // Fetch subscription details
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Failed to verify subscription' })
  }

  if (!subscription) {
    return res.status(200).json({ 
      isActive: false, 
      status: 'free',
      message: 'No subscription found'
    })
  }

  // Check if expired
  const isExpired = subscription.current_period_end && 
    new Date(subscription.current_period_end) < new Date()
  
  const isActive = subscription.status === 'active' && !isExpired

  return res.status(200).json({
    isActive,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end
  })
}