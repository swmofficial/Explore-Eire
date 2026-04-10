// create-checkout-session.js — Vercel serverless function
// Creates a Stripe Checkout session for Explorer subscription
// TODO: implement Stripe checkout session creation

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // TODO:
  // 1. Verify Supabase auth token from request headers
  // 2. Determine price ID (monthly vs annual) from req.body.priceType
  // 3. Create Stripe checkout session with success/cancel URLs
  // 4. Return session.url for client redirect

  res.status(501).json({ error: 'Not implemented' })
}
