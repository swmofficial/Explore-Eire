import { createClient } from '@supabase/supabase-js'
import { verifySubscription } from './lib/requireSubscription.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Missing authorization header',
      isActive: false,
      status: 'unauthenticated'
    })
  }

  const token = authHeader.slice(7)
  
  // Verify JWT and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      isActive: false,
      status: 'unauthenticated'
    })
  }

  const { isActive, status, subscription } = await verifySubscription(user.id)
  
  return res.status(200).json({
    isActive,
    status,
    currentPeriodEnd: subscription?.current_period_end || null
  })
}
