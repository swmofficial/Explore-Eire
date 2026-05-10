import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Extract authenticated user ID from request.
 * Verifies the Supabase access token from Authorization header.
 * 
 * @param {Request} req
 * @returns {Promise<{userId: string|null, error?: string}>}
 */
export async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, error: 'Missing authorization header' }
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return { userId: null, error: error?.message || 'Invalid token' }
  }
  
  return { userId: user.id }
}