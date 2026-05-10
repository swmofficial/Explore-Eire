import { withSubscriptionCheck } from './lib/verifySubscription.js'

/**
 * Example premium API route with server-side subscription verification.
 * Clone and modify this pattern for all premium-only endpoints.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // This will return 403 if user doesn't have active subscription
  const result = await withSubscriptionCheck(req, res, { requirePremium: true })
  
  if (result === null) {
    // Response already sent (401 or 403)
    return
  }

  // User has verified premium subscription — return premium data
  // Replace this with actual premium data fetching logic
  return res.status(200).json({
    message: 'Premium data accessed successfully',
    userId: result.userId,
    subscriptionStatus: result.subscription.status
  })
}