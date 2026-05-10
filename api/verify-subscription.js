import { withSubscriptionCheck } from './lib/verifySubscription.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const result = await withSubscriptionCheck(req, res, { requirePremium: false })
  
  if (result === null) {
    // Response already sent by withSubscriptionCheck
    return
  }

  return res.status(200).json({
    isActive: result.subscription.isActive,
    status: result.subscription.status
  })
}