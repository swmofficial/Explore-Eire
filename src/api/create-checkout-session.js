// create-checkout-session.js — Vercel serverless function
// POST { plan: 'monthly' | 'annual', userId }
// Returns { url } — client redirects to Stripe Checkout
import Stripe from 'stripe'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { plan, userId } = req.body || {}

  if (!plan || !userId) {
    return res.status(400).json({ error: 'Missing plan or userId' })
  }

  const priceId =
    plan === 'monthly'
      ? process.env.STRIPE_PRICE_ID_MONTHLY
      : process.env.STRIPE_PRICE_ID_ANNUAL

  if (!priceId) {
    return res.status(500).json({ error: `Price ID not configured for plan: ${plan}` })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10',
  })

  const appUrl = process.env.APP_URL || 'https://exploreeire.ie'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: userId },
      },
      metadata: { user_id: userId },
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
