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

  // Step 1: Authenticate user
  const { userId, error: authError } = await getUserFromRequest(req)
  
  if (!userId) {
    return res.status(401).json({ error: authError || 'Authentication required' })
  }

  // Step 2: Verify premium subscription (SERVER-SIDE CHECK)
  const { authorized, error: subError, status } = await verifySubscription(userId)
  
  if (!authorized) {
    return res.status(status).json({ error: subError })
  }

  // Step 3: Return premium content (user is verified premium)
  try {
    const { data, error } = await supabase
      .from('premium_content')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ data })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}